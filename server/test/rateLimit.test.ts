/**
 * HTTP tests for the auth rate limiter (plan.md item 10).
 *
 * POST /auth/steam is capped per-IP so a client can't grind Steam tickets.
 * The limiter gets a fresh in-memory store per app instance, so tests pass a
 * small max through createApp deps and hammer the endpoint.
 */
/// <reference types="jest" />

import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { STEAM_IDENTITY } from "../src/services/steamAuth";

const KEY = "test-publisher-key";
const APP_IDS = [3757600];
const TICKET = "deadbeef";
const STEAM_ID = "76561198000000000";

/** Mock Steam Web API: every ticket is valid. */
const steamFetch = (async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    response: { params: { result: "OK", steamid: STEAM_ID } },
  }),
})) as unknown as typeof fetch;

const AUTH_BODY = { ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 };

describe("POST /api/v1/auth/steam rate limit", () => {
  it("rejects with 429 rate_limited once the per-IP limit is exceeded", async () => {
    const app: Express = createApp({
      steam: { webApiKey: KEY, appIds: APP_IDS },
      steamFetch,
      authRateLimitMax: 3,
      authRateLimitWindowMs: 60_000,
    });

    for (let i = 0; i < 3; i++) {
      const ok = await request(app).post("/api/v1/auth/steam").send(AUTH_BODY);
      expect(ok.status).toBe(200);
    }

    const limited = await request(app).post("/api/v1/auth/steam").send(AUTH_BODY);
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({
      error: "rate_limited",
      message: expect.any(String) as string,
    });
  });

  it("counts every request to the endpoint, including failed validations", async () => {
    const app: Express = createApp({
      steam: { webApiKey: KEY, appIds: APP_IDS },
      steamFetch,
      authRateLimitMax: 2,
      authRateLimitWindowMs: 60_000,
    });

    // Malformed body → 400, but still consumes quota (guards brute-forcing).
    await request(app)
      .post("/api/v1/auth/steam")
      .send({ ticket: "not-hex!", identity: STEAM_IDENTITY, appId: 3757600 });
    await request(app).post("/api/v1/auth/steam").send(AUTH_BODY);

    const limited = await request(app).post("/api/v1/auth/steam").send(AUTH_BODY);
    expect(limited.status).toBe(429);
  });

  it("does not rate-limit unrelated endpoints", async () => {
    const app: Express = createApp({
      steam: { webApiKey: KEY, appIds: APP_IDS },
      steamFetch,
      authRateLimitMax: 1,
      authRateLimitWindowMs: 60_000,
    });

    await request(app).post("/api/v1/auth/steam").send(AUTH_BODY);
    await request(app).post("/api/v1/auth/steam").send(AUTH_BODY);

    // /health is outside the limiter's mount path.
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
  });

  it("keys per real client IP behind the frontend (trust proxy)", async () => {
    // supertest connects directly, so with `trust proxy: 1` in createApp the
    // X-Forwarded-For client IP is honored — each client gets its own quota
    // instead of sharing one bucket keyed by the frontend's address.
    const app: Express = createApp({
      steam: { webApiKey: KEY, appIds: APP_IDS },
      steamFetch,
      authRateLimitMax: 2,
      authRateLimitWindowMs: 60_000,
    });

    const post = (client: string) =>
      request(app)
        .post("/api/v1/auth/steam")
        .set("X-Forwarded-For", client)
        .send(AUTH_BODY);

    const a1 = await post("203.0.113.10");
    const b1 = await post("203.0.113.20");
    expect(a1.status).toBe(200);
    expect(b1.status).toBe(200);

    // Client A exhausts its own quota; B is untouched (independent buckets).
    const a2 = await post("203.0.113.10");
    expect(a2.status).toBe(200);
    const aLimited = await post("203.0.113.10");
    expect(aLimited.status).toBe(429);
    expect(aLimited.body.error).toBe("rate_limited");

    const b2 = await post("203.0.113.20");
    expect(b2.status).toBe(200);
  });

  it("keys by the frontend-appended IP, ignoring spoofed prefixes", async () => {
    const app: Express = createApp({
      steam: { webApiKey: KEY, appIds: APP_IDS },
      steamFetch,
      authRateLimitMax: 2,
      authRateLimitWindowMs: 60_000,
    });

    // The Google frontend appends the real client IP to X-Forwarded-For, so a
    // chain looks like "<maybe-fake>, <real>". With one trusted hop Express
    // uses the appended (rightmost) entry — a client cannot pick its bucket
    // by prepending entries.
    const post = (realClient: string, fakePrefix = "198.51.100.7") =>
      request(app)
        .post("/api/v1/auth/steam")
        .set("X-Forwarded-For", `${fakePrefix}, ${realClient}`)
        .send(AUTH_BODY);

    const a1 = await post("203.0.113.10");
    // Same real client behind a different fake prefix: same bucket.
    const a2 = await post("203.0.113.10", "192.0.2.99");
    expect(a1.status).toBe(200);
    expect(a2.status).toBe(200);

    const aLimited = await post("203.0.113.10");
    expect(aLimited.status).toBe(429);
    expect(aLimited.body.error).toBe("rate_limited");

    // A different real client gets its own bucket despite the shared prefix.
    const b1 = await post("203.0.113.20");
    expect(b1.status).toBe(200);
  });

  it("does not let clients choose their bucket (single trusted hop)", async () => {
    const app: Express = createApp({
      steam: { webApiKey: KEY, appIds: APP_IDS },
      steamFetch,
      authRateLimitMax: 2,
      authRateLimitWindowMs: 60_000,
    });

    // Only the last hop (the frontend) is trusted, so the rightmost entry
    // always wins — prepending entries cannot move a client to a fresh
    // bucket, they just share the bucket keyed by that entry.
    const post = (x: string) =>
      request(app)
        .post("/api/v1/auth/steam")
        .set("X-Forwarded-For", x)
        .send(AUTH_BODY);

    await post("203.0.113.10, 198.51.100.7");
    await post("203.0.113.20, 198.51.100.7");
    const limited = await post("203.0.113.30, 198.51.100.7");
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe("rate_limited");
  });
});
