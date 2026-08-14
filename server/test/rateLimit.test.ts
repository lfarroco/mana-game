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
});
