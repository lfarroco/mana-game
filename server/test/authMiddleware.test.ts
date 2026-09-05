/**
 * Unit tests for the bearer auth middleware (plan.md item 8).
 *
 * Exercises the full auth path against a protected test route: header parsing
 * (missing/malformed → `missing_token`), token lookup by hash + expiry
 * (unknown/expired → `invalid_token`), and attaching the player id.
 */
/// <reference types="jest" />

import express from "express";
import request from "supertest";
import type { Express } from "express";
import { requireAuth } from "../src/http/middleware/auth";
import { errorHandler } from "../src/http/middleware/errors";
import { createMemoryTokenRepo } from "../src/persistence/memory";
import type { TokenRepo } from "../src/persistence/repositories";
import { createTokenService } from "../src/services/tokenService";

let tokenRepo: TokenRepo;
let app: Express;

beforeEach(() => {
  tokenRepo = createMemoryTokenRepo();
  app = express();
  app.use("/protected", requireAuth({ tokenRepo }), (req, res) => {
    res.json({ playerId: req.playerId });
  });
  app.use(errorHandler); // serializes ApiErrors as { error, message }
});

describe("requireAuth", () => {
  it("rejects a missing Authorization header with 401 missing_token", async () => {
    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("missing_token");
  });

  it("rejects malformed Authorization headers", async () => {
    for (const header of [
      "Basic abc",
      "Bearer",
      "bearer",
      "Token abc",
      "Bearer   ",
      "Bearer  \t",
    ]) {
      const res = await request(app)
        .get("/protected")
        .set("Authorization", header);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("missing_token");
    }
  });

  it("rejects an unknown token with 401 invalid_token", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer definitely-not-issued");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_token");
  });

  it("rejects an expired token with 401 invalid_token", async () => {
    // issueToken with a negative TTL produces an already-expired record.
    const token = await createTokenService(tokenRepo).issueToken("player-1", -1);

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_token");
  });

  it("attaches the player id for a valid token", async () => {
    const token = await createTokenService(tokenRepo).issueToken("player-1");

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ playerId: "player-1" });
  });

  it("accepts the Bearer scheme case-insensitively", async () => {
    const token = await createTokenService(tokenRepo).issueToken("player-1");

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.playerId).toBe("player-1");
  });

  it("only accepts tokens for a single playerId (no cross-account reuse)", async () => {
    const tokenA = await createTokenService(tokenRepo).issueToken("player-a");
    const tokenB = await createTokenService(tokenRepo).issueToken("player-b");

    const resA = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${tokenA}`);
    const resB = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(resA.body.playerId).toBe("player-a");
    expect(resB.body.playerId).toBe("player-b");
  });
});
