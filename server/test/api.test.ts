/**
 * HTTP integration tests for session API endpoints.
 *
 * Every session request is authenticated with a bearer token obtained via
 * POST /api/v1/auth/steam (the Steam Web API is mocked through the app's
 * injectable steamFetch), so these tests exercise the real auth path.
 */
/// <reference types="jest" />

import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import {
  createMemoryGhostRepo,
  createMemoryRatingRepo,
  createMemorySessionRepo,
} from "../src/persistence/memory";
import type {
  GhostRepo,
  RatingRepo,
  SessionRepo,
} from "../src/persistence/repositories";
import { STEAM_IDENTITY } from "../src/services/steamAuth";
import { PVE_ENEMY_NAME } from "../src/services/matchmaking";
import { getMultiplayerRatingDelta } from "../src/services/rating";

const KEY = "test-publisher-key";
const APP_IDS = [3757600, 4233280];
const CRYSTAL = "critical_crystal";

/** Hex tickets; each maps to a distinct steam account (per-player isolation). */
const TICKET_P1 = "aaaa";
const TICKET_P2 = "bbbb";
const STEAM_IDS: Record<string, string> = {
  [TICKET_P1]: "76561198000000001",
  [TICKET_P2]: "76561198000000002",
};

/** Mock Steam Web API: a valid ticket resolves to that ticket's steam account. */
const steamFetch = (async (url: string) => {
  const ticket = new URL(url).searchParams.get("ticket") ?? "";
  const steamId = STEAM_IDS[ticket] ?? "76561198000000000";
  return {
    ok: true,
    status: 200,
    json: async () => ({
      response: { params: { result: "OK", steamid: steamId } },
    }),
  } as unknown as Response;
}) as typeof fetch;

let repo: SessionRepo;
let ghostRepo: GhostRepo;
let ratingRepo: RatingRepo;
let app: Express;

beforeEach(() => {
  repo = createMemorySessionRepo();
  ghostRepo = createMemoryGhostRepo();
  ratingRepo = createMemoryRatingRepo();
  app = createApp({
    repo,
    ghostRepo,
    ratingRepo,
    steam: { webApiKey: KEY, appIds: APP_IDS },
    steamFetch,
  });
});

/**
 * Login through the real auth endpoint (mocked Steam API) and return the
 * bearer token plus the server-generated player id used for sessions.
 */
async function login(
  ticket: string,
): Promise<{ token: string; playerId: string }> {
  const res = await request(app)
    .post("/api/v1/auth/steam")
    .send({ ticket, identity: STEAM_IDENTITY, appId: 3757600 });
  expect(res.status).toBe(200);
  return {
    token: res.body.token as string,
    playerId: res.body.player.playerId as string,
  };
}

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("POST /api/v1/sessions", () => {
  it("creates a multiplayer session and returns 201", async () => {
    const { token } = await login(TICKET_P1);

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: "critical_crystal" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("phase", "encounter");
    expect(res.body).toHaveProperty("round", 1);
    expect(res.body.session_type).toEqual({
      type: "multiplayer",
      queueType: "casual",
    });
    expect(res.body.team.units).toHaveLength(1); // crystal core
  });

  it("defaults queueType to casual when omitted", async () => {
    const { token } = await login(TICKET_P1);

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    expect(res.status).toBe(201);
    expect(res.body.session_type.queueType).toBe("casual");
  });

  it("accepts an explicit ranked queueType", async () => {
    const { token } = await login(TICKET_P1);

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL, queueType: "ranked" });

    expect(res.status).toBe(201);
    expect(res.body.session_type.queueType).toBe("ranked");
  });

  it("returns 401 without a bearer token", async () => {
    const res = await request(app)
      .post("/api/v1/sessions")
      .send({ crystalId: CRYSTAL });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("missing_token");
  });

  it("returns 401 for an invalid bearer token", async () => {
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", "Bearer not-a-real-token")
      .send({ crystalId: CRYSTAL });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_token");
  });

  it("returns 400 when crystalId is missing", async () => {
    const { token } = await login(TICKET_P1);

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown crystalId", async () => {
    const { token } = await login(TICKET_P1);

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: "not_a_crystal" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid queueType", async () => {
    const { token } = await login(TICKET_P1);

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL, queueType: "uber" });
    expect(res.status).toBe(400);
  });

  it("returns 409 when the player already has an active session", async () => {
    const { token } = await login(TICKET_P1);

    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    expect(res.status).toBe(409);
  });

  it("keeps sessions isolated per player", async () => {
    const p1 = await login(TICKET_P1);
    const p2 = await login(TICKET_P2);

    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${p1.token}`)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${p2.token}`)
      .send({ crystalId: CRYSTAL });

    expect(res.status).toBe(201);
  });

  it("initializes the player's default rating (1000) on session creation", async () => {
    const { token, playerId } = await login(TICKET_P1);

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });
    expect(res.status).toBe(201);

    expect(ratingRepo.get(playerId)).toEqual({
      playerId,
      rating: 1000,
      updatedAt: expect.any(Number),
    });
  });
});

describe("GET /api/v1/sessions/current", () => {
  it("returns 401 without a bearer token", async () => {
    const res = await request(app).get("/api/v1/sessions/current");
    expect(res.status).toBe(401);
  });

  it("returns 404 when no session exists", async () => {
    const { token } = await login(TICKET_P1);

    const res = await request(app)
      .get("/api/v1/sessions/current")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("returns the active session after creation", async () => {
    const { token } = await login(TICKET_P1);
    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .get("/api/v1/sessions/current")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("phase", "encounter");
  });

  it("does not expose another player's session", async () => {
    const p1 = await login(TICKET_P1);
    const p2 = await login(TICKET_P2);
    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${p1.token}`)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .get("/api/v1/sessions/current")
      .set("Authorization", `Bearer ${p2.token}`);
    expect(res.status).toBe(404);
  });

  it("returns serialized combatState while in combat phase", async () => {
    const { token } = await login(TICKET_P1);
    await createAndSkipToPreCombat(token);

    await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: { type: "start_combat" } });

    const res = await request(app)
      .get("/api/v1/sessions/current")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.phase).toBe("combat");
    expect(res.body.combatState).toBeDefined();
    expect(res.body.combatState).toHaveProperty("logs");
    expect(typeof res.body.combatState.wonCombat).toBe("boolean");
  });
});

describe("POST /api/v1/sessions/current/actions", () => {
  it("returns 404 when no session exists", async () => {
    const { token } = await login(TICKET_P1);

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: { type: "skip" } });
    expect(res.status).toBe(404);
  });

  it("returns 400 for missing action", async () => {
    const { token } = await login(TICKET_P1);
    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown action type", async () => {
    const { token } = await login(TICKET_P1);
    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: { type: "teleport" } });
    expect(res.status).toBe(400);
  });

  it("processes skip actions and advances to pre_combat", async () => {
    const { token } = await login(TICKET_P1);
    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    const res = await skipToPreCombat(token);

    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe("pre_combat");
  });

  it("returns 409 for actions on a finished session", async () => {
    const { token } = await login(TICKET_P1);
    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: "critical_crystal" });

    const terminal = await driveToTerminal(token);
    expect(["victory", "game_over"]).toContain(terminal.phase);

    const after = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: { type: "skip" } });
    expect(after.status).toBe(409);
  });

  it("triggers combat on start_combat and returns serialized combatState", async () => {
    const { token } = await login(TICKET_P1);
    await createAndSkipToPreCombat(token);

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: { type: "start_combat" } });

    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe("combat");
    // The raw Map-carrying CombatState is never sent; the session payload and
    // top-level field both carry the JSON-safe serialized DTO.
    expect(res.body.combatState).toBeDefined();
    expect(res.body.combatState).toHaveProperty("logs");
    expect(res.body.combatState).toHaveProperty("wonCombat");
    expect(res.body.combatState).toHaveProperty("enemyPlayerName");
    expect(Array.isArray(res.body.combatState.units)).toBe(true);
    expect(res.body.session.combatState).toEqual(res.body.combatState);
  });

  it("end_combat advances the run and persists the session", async () => {
    const { token } = await login(TICKET_P1);
    await createAndSkipToPreCombat(token);

    await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: { type: "start_combat" } });

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: { type: "end_combat" } });

    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe("encounter");
    expect(res.body.session.round).toBe(2);
    expect(res.body.session.wins + res.body.session.losses).toBe(1);
  });

  it("start_combat stores a ghost snapshot and resolves the enemy via matchmaking", async () => {
    const { token, playerId } = await login(TICKET_P1);
    await createAndSkipToPreCombat(token);

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: { type: "start_combat" } });

    expect(res.status).toBe(200);
    // No ghosts exist yet → the matchmaking path guarantees the PvE fallback.
    expect(res.body.combatState.enemyPlayerName).toBe(PVE_ENEMY_NAME);
    expect(res.body.combatState.units.length).toBeGreaterThan(0);

    // The player's team was snapshotted as a ghost for the current round.
    const ghosts = ghostRepo.findByRound(1);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].playerId).toBe(playerId);
    expect(ghosts[0].team.length).toBeGreaterThan(0);
    expect(ghosts[0].team.every((unit) => unit.force === "CPU")).toBe(true);
  });

  it("applies the rating delta after a completed run", async () => {
    const { token, playerId } = await login(TICKET_P1);
    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    // The terminal session is returned in the action response — that's the
    // only place the client sees the finished run (it is not served again).
    const terminal = await driveToTerminal(token);
    expect(["victory", "game_over"]).toContain(terminal.phase);

    const wins = terminal.wins;
    const rating = ratingRepo.get(playerId);
    expect(rating).not.toBeNull();
    expect(rating!.rating).toBe(1000 + getMultiplayerRatingDelta(wins));
  });

  it("no longer serves a finished session (GET /sessions/current → 404)", async () => {
    const { token } = await login(TICKET_P1);
    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    const terminal = await driveToTerminal(token);
    expect(["victory", "game_over"]).toContain(terminal.phase);

    const res = await request(app)
      .get("/api/v1/sessions/current")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("no_active_session");
  });

  it("allows creating a new session after a run finished (no client delete needed)", async () => {
    const { token } = await login(TICKET_P1);
    await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: CRYSTAL });

    const terminal = await driveToTerminal(token);
    expect(["victory", "game_over"]).toContain(terminal.phase);

    // The player can only create a new session — the server owns the
    // lifecycle, so the finished run does not block a fresh one.
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ crystalId: "critical_crystal" });
    expect(res.status).toBe(201);
    expect(res.body.phase).toBe("encounter");
    expect(res.body.id).not.toBe(terminal.sessionId);

    // The new run is active and playable.
    const current = await request(app)
      .get("/api/v1/sessions/current")
      .set("Authorization", `Bearer ${token}`);
    expect(current.status).toBe(200);
    expect(current.body.phase).toBe("encounter");
  });
});

// --- helpers ---

async function createAndSkipToPreCombat(token: string) {
  await request(app)
    .post("/api/v1/sessions")
    .set("Authorization", `Bearer ${token}`)
    .send({ crystalId: CRYSTAL });
  await skipToPreCombat(token);
}

/** The run starts at encounter/step 1; two skips land on pre_combat/step 3. */
async function skipToPreCombat(token: string) {
  let res = await request(app)
    .post("/api/v1/sessions/current/actions")
    .set("Authorization", `Bearer ${token}`)
    .send({ action: { type: "skip" } });
  expect(res.status).toBe(200);
  res = await request(app)
    .post("/api/v1/sessions/current/actions")
    .set("Authorization", `Bearer ${token}`)
    .send({ action: { type: "skip" } });
  expect(res.status).toBe(200);
  return res;
}

/**
 * Play a run to a terminal phase (victory or game_over), returning the phase
 * and the terminal session fields carried in the action response — the only
 * place the client ever sees a finished run.
 */
async function driveToTerminal(token: string): Promise<{
  phase: string;
  wins: number;
  sessionId: string;
}> {
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
      return {
        phase,
        wins: res.body.session.wins as number,
        sessionId: res.body.session.id as string,
      };
    }
  }
  throw new Error(`Run did not reach a terminal phase (stuck at '${phase}')`);
}
