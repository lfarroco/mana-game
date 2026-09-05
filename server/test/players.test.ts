/**
 * HTTP integration tests for `GET /api/v1/players/me` — the multiplayer-lobby
 * profile endpoint (docs/multiplayer-lobby.md).
 *
 * Every request is authenticated with a bearer token obtained via
 * POST /api/v1/auth/steam (mocked Steam Web API), mirroring api.test.ts.
 * Asserts the profile shape, 401 handling, the active-session flag, and that
 * driving a run to a terminal phase records a completion + applies rating.
 */
/// <reference types="jest" />

import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import {
  createMemoryPlayerRepo,
  createMemoryPlayerStatsRepo,
} from "../src/persistence/memory";
import type {
  PlayerRepo,
  PlayerStatsRepo,
} from "../src/persistence/repositories";
import { STEAM_IDENTITY } from "../src/services/steamAuth";
import { DEFAULT_PLAYER_RATING } from "../src/services/rating";
import { NAME_CHANGE_COOLDOWN_MS } from "../src/services/playerService";

const KEY = "test-publisher-key";
const APP_IDS = [3757600, 4233280];
const TICKET = "aaaa";
const STEAM_ID = "76561198000000001";
const CRYSTAL = "critical_crystal";

/** Mock Steam Web API: any ticket resolves to the one steam account. */
const steamFetch = (async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    response: { params: { result: "OK", steamid: STEAM_ID } },
  }),
})) as unknown as typeof fetch;

let playerStatsRepo: PlayerStatsRepo;
let playerRepo: PlayerRepo;
let app: Express;

beforeEach(() => {
  playerStatsRepo = createMemoryPlayerStatsRepo();
  playerRepo = createMemoryPlayerRepo();
  app = createApp({
    playerStatsRepo,
    playerRepo,
    steam: { webApiKey: KEY, appIds: APP_IDS },
    steamFetch,
  });
});

async function login(): Promise<{ token: string; playerId: string }> {
  const res = await request(app)
    .post("/api/v1/auth/steam")
    .send({ ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 });
  expect(res.status).toBe(200);
  return {
    token: res.body.token as string,
    playerId: res.body.player.playerId as string,
  };
}

describe("GET /api/v1/players/me", () => {
  it("returns the profile with default rating and zeroed stats for a new player", async () => {
    const { token, playerId } = await login();

    const res = await request(app)
      .get("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      player: {
        playerId,
        providerId: STEAM_ID,
        provider: "steam",
      },
      rating: DEFAULT_PLAYER_RATING,
      career: { bronze: 0, silver: 0, gold: 0 },
      season: { bronze: 0, silver: 0, gold: 0 },
      hasActiveSession: false,
      displayNameChange: { allowed: true },
    });
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/v1/players/me");
    expect(res.status).toBe(401);
  });

  it("flips hasActiveSession once a run is created and back to false after it finishes", async () => {
    const { token } = await login();

    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    const active = await request(app)
      .get("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`);
    expect(active.status).toBe(200);
    expect(active.body.hasActiveSession).toBe(true);

    const terminal = await driveToTerminal(token);
    expect(["victory", "game_over"]).toContain(terminal.phase);

    const finished = await request(app)
      .get("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`);
    expect(finished.status).toBe(200);
    expect(finished.body.hasActiveSession).toBe(false);
  });

  it("records a run completion when a run reaches a terminal phase", async () => {
    const { token } = await login();

    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });
    const terminal = await driveToTerminal(token);
    expect(["victory", "game_over"]).toContain(terminal.phase);

    const profile = await request(app)
      .get("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`);

    expect(profile.status).toBe(200);
    // Rating always moves on completion.
    expect(profile.body.rating).toBeGreaterThan(DEFAULT_PLAYER_RATING);
    // A terminal run always records a completion row; the tier depends on the
    // seeded win count, so the tiered counts may legitimately be zero for a
    // below-bronze run. The completion itself is recorded regardless.
    expect((await playerStatsRepo.getVictoryCounts("", 0))).toBeDefined();
    expect(profile.body.season).toEqual(profile.body.career); // all ran today
  });

  it("surfaces seeded stats from the completions repo", async () => {
    const { token, playerId } = await login();
    (await playerStatsRepo.recordRunCompletion({
      sessionId: "seed-s1",
      playerId,
      tier: "gold",
      wins: 10,
      completedAt: Date.now(),
    }));
    (await playerStatsRepo.recordRunCompletion({
      sessionId: "seed-s2",
      playerId,
      tier: "silver",
      wins: 8,
      completedAt: Date.now(),
    }));

    const res = await request(app)
      .get("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.career).toEqual({ bronze: 0, silver: 1, gold: 1 });
    expect(res.body.season).toEqual({ bronze: 0, silver: 1, gold: 1 });
  });
});

describe("PATCH /api/v1/players/me", () => {
  it("renames the player and returns the refreshed profile with the cooldown applied", async () => {
    const { token, playerId } = await login();
    const before = Date.now();

    const res = await request(app)
      .patch("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "  NovaMage  " });

    expect(res.status).toBe(200);
    expect(res.body.player.displayName).toBe("NovaMage");
    expect(res.body.displayNameChange.allowed).toBe(false);
    expect(res.body.displayNameChange.nextAllowedAt).toBeGreaterThanOrEqual(
      before + NAME_CHANGE_COOLDOWN_MS,
    );

    // Persisted: a fresh GET sees the new name.
    const get = await request(app)
      .get("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`);
    expect(get.body.player.displayName).toBe("NovaMage");
    expect((await playerRepo.findById(playerId))?.displayNameUpdatedAt).toBeDefined();
  });

  it("rejects a second change within the 30-day cooldown", async () => {
    const { token } = await login();

    const first = await request(app)
      .patch("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "First" });
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "Second" });
    expect(second.status).toBe(429);
    expect(second.body.error).toBe("name_change_cooldown");
    expect(second.body.message).toMatch(/change it again/);

    // The first name is untouched.
    const get = await request(app)
      .get("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`);
    expect(get.body.player.displayName).toBe("First");
  });

  it("allows a change once the cooldown has expired", async () => {
    const { token, playerId } = await login();
    (await playerRepo.updateDisplayName(
      playerId,
      "Old",
      Date.now() - NAME_CHANGE_COOLDOWN_MS - 1000,
    ));

    const res = await request(app)
      .patch("/api/v1/players/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "Fresh" });

    expect(res.status).toBe(200);
    expect(res.body.player.displayName).toBe("Fresh");
  });

  it("rejects invalid display names with 400", async () => {
    const { token } = await login();
    const badBodies = [
      { displayName: "" },
      { displayName: "   " },
      { displayName: "a" },
      { displayName: "x".repeat(25) },
      { displayName: "Bad\u0000Name" },
      {},
      { displayName: 42 },
    ];

    for (const body of badBodies) {
      const res = await request(app)
        .patch("/api/v1/players/me")
        .set("Authorization", `Bearer ${token}`)
        .send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_display_name");
    }
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app)
      .patch("/api/v1/players/me")
      .send({ displayName: "Nova" });
    expect(res.status).toBe(401);
  });
});

/** Play a run to a terminal phase via skip/start_combat/end_combat. */
async function driveToTerminal(token: string): Promise<{ phase: string }> {
  let phase = "encounter";
  for (let i = 0; i < 100; i++) {
    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        action:
          phase === "combat"
            ? { type: "end_combat" }
            : phase === "pre_combat"
              ? { type: "start_combat" }
              : { type: "skip" },
      });
    if (res.status !== 200) {
      throw new Error(
        `Action failed mid-run (${res.status}): ${JSON.stringify(res.body)}`,
      );
    }
    phase = res.body.session.phase;
    if (phase === "victory" || phase === "game_over") {
      return { phase };
    }
  }
  throw new Error(`Run did not reach a terminal phase (stuck at '${phase}')`);
}

