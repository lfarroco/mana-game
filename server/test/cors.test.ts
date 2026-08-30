/**
 * CORS middleware tests — the browser-facing half of the API contract.
 *
 * The Phaser client (web build / Capacitor webview) calls the server
 * cross-origin, so every non-simple request (PATCH with a JSON body +
 * Authorization, like the lobby rename) triggers a preflight OPTIONS. The
 * preflight response must advertise the method and headers the client sends,
 * or the browser blocks the real request with a bare `Failed to fetch`.
 *
 * Regression test: the rename endpoint (`PATCH /api/v1/players/me`) was
 * unreachable from the browser because `PATCH` was missing from
 * `Access-Control-Allow-Methods` while GET/POST worked — the lobby loaded but
 * every rename attempt failed at the network layer.
 */
/// <reference types="jest" />

import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";

const KEY = "test-publisher-key";
const APP_IDS = [3757600, 4233280];

const steamFetch = (async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    response: { params: { result: "OK", steamid: "76561198000000001" } },
  }),
})) as unknown as typeof fetch;

let app: Express;

beforeEach(() => {
  app = createApp({
    steam: { webApiKey: KEY, appIds: APP_IDS },
    steamFetch,
    corsOrigin: "*",
  });
});

describe("CORS preflight", () => {
  it("advertises PATCH for the rename endpoint", async () => {
    const res = await request(app)
      .options("/api/v1/players/me")
      .set("Origin", "http://localhost:8080")
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "content-type, authorization");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["access-control-allow-methods"]).toContain("PATCH");
    expect(res.headers["access-control-allow-headers"]).toContain("Content-Type");
    expect(res.headers["access-control-allow-headers"]).toContain("Authorization");
  });

  it("still allows GET and POST preflights", async () => {
    for (const method of ["GET", "POST"]) {
      const res = await request(app)
        .options("/api/v1/players/me")
        .set("Origin", "http://localhost:8080")
        .set("Access-Control-Request-Method", method)
        .set("Access-Control-Request-Headers", "authorization");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-methods"]).toContain(method);
    }
  });

  it("applies the CORS header to the actual cross-origin PATCH response", async () => {
    // Unauthenticated → 401, but the CORS header must still be present so the
    // browser accepts the response (the preflight already passed).
    const res = await request(app)
      .patch("/api/v1/players/me")
      .set("Origin", "http://localhost:8080")
      .set("Content-Type", "application/json")
      .send({ displayName: "NovaMage" });

    expect(res.status).toBe(401);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });
});
