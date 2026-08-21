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

  it("keys per real client IP behind a local reverse proxy (trust proxy)", async () => {
    // supertest connects from 127.0.0.1 (loopback), so with `trust proxy:
    // loopback` in createApp the X-Forwarded-For client IP is honored — each
    // client gets its own quota instead of sharing one bucket behind Caddy.
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

  it("walks past Cloudflare edge IPs to the real client (CF + Caddy chain)", async () => {
    const app: Express = createApp({
      steam: { webApiKey: KEY, appIds: APP_IDS },
      steamFetch,
      authRateLimitMax: 2,
      authRateLimitWindowMs: 60_000,
    });

    // X-Forwarded-For exactly as the server sees it behind Caddy+Cloudflare:
    // [real client, cf edge]. 173.245.48.42 sits inside Cloudflare's
    // 173.245.48.0/20, so it must be skipped and the real client used as the
    // rate-limit key (per-player buckets instead of per-Cloudflare-PoP).
    const post = (realClient: string) =>
      request(app)
        .post("/api/v1/auth/steam")
        .set("X-Forwarded-For", `${realClient}, 173.245.48.42`)
        .send(AUTH_BODY);

    const a1 = await post("203.0.113.10");
    const a2 = await post("203.0.113.10");
    expect(a1.status).toBe(200);
    expect(a2.status).toBe(200);

    const aLimited = await post("203.0.113.10");
    expect(aLimited.status).toBe(429);
    expect(aLimited.body.error).toBe("rate_limited");

    // A different real client behind the SAME Cloudflare edge IP gets its own
    // bucket — proving the CF IP was walked past, not used as the key.
    const b1 = await post("203.0.113.20");
    expect(b1.status).toBe(200);
  });

  it("does not trust non-Cloudflare middle hops (spoofing resistance)", async () => {
    const app: Express = createApp({
      steam: { webApiKey: KEY, appIds: APP_IDS },
      steamFetch,
      authRateLimitMax: 2,
      authRateLimitWindowMs: 60_000,
    });

    // 198.51.100.7 (documentation TEST-NET) is neither loopback nor a
    // Cloudflare range → the rightmost untrusted hop wins, so a client cannot
    // bypass the limiter by prepending fake X-Forwarded-For entries.
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
