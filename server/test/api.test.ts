/**
 * HTTP integration tests for session API endpoints.
 */
/// <reference types="jest" />

import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { createMemorySessionRepo } from "../src/persistence/memory";
import type { SessionRepo } from "../src/persistence/repositories";

const P1 = "player-1";
const P2 = "player-2";
const CRYSTAL = "critical_crystal";

let repo: SessionRepo;
let app: Express;

beforeEach(() => {
  repo = createMemorySessionRepo();
  app = createApp({ repo });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("POST /api/v1/sessions", () => {
  it("creates a multiplayer session and returns 201", async () => {
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
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
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    expect(res.status).toBe(201);
    expect(res.body.session_type.queueType).toBe("casual");
  });

  it("accepts an explicit ranked queueType", async () => {
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL, queueType: "ranked" });

    expect(res.status).toBe(201);
    expect(res.body.session_type.queueType).toBe("ranked");
  });

  it("returns 400 when X-Player-Id is missing", async () => {
    const res = await request(app)
      .post("/api/v1/sessions")
      .send({ crystalId: CRYSTAL });
    expect(res.status).toBe(400);
  });

  it("returns 400 when crystalId is missing", async () => {
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown crystalId", async () => {
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: "not_a_crystal" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid queueType", async () => {
    const res = await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL, queueType: "uber" });
    expect(res.status).toBe(400);
  });

  it("returns 409 when the player already has an active session", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    expect(res.status).toBe(409);
  });

  it("keeps sessions isolated per player", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P2)
      .send({ crystalId: CRYSTAL });

    expect(res.status).toBe(201);
  });
});

describe("GET /api/v1/sessions/current", () => {
  it("returns 400 without a player id", async () => {
    const res = await request(app).get("/api/v1/sessions/current");
    expect(res.status).toBe(400);
  });

  it("returns 404 when no session exists", async () => {
    const res = await request(app)
      .get("/api/v1/sessions/current")
      .set("X-Player-Id", P1);
    expect(res.status).toBe(404);
  });

  it("returns the active session after creation", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .get("/api/v1/sessions/current")
      .set("X-Player-Id", P1);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("phase", "encounter");
  });

  it("does not expose another player's session", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .get("/api/v1/sessions/current")
      .set("X-Player-Id", P2);
    expect(res.status).toBe(404);
  });

  it("returns serialized combatState while in combat phase", async () => {
    await createAndSkipToPreCombat(P1);

    await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("X-Player-Id", P1)
      .send({ action: { type: "start_combat" } });

    const res = await request(app)
      .get("/api/v1/sessions/current")
      .set("X-Player-Id", P1);

    expect(res.status).toBe(200);
    expect(res.body.phase).toBe("combat");
    expect(res.body.combatState).toBeDefined();
    expect(res.body.combatState).toHaveProperty("logs");
    expect(typeof res.body.combatState.wonCombat).toBe("boolean");
  });
});

describe("POST /api/v1/sessions/current/actions", () => {
  it("returns 404 when no session exists", async () => {
    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("X-Player-Id", P1)
      .send({ action: { type: "skip" } });
    expect(res.status).toBe(404);
  });

  it("returns 400 for missing action", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("X-Player-Id", P1)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown action type", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("X-Player-Id", P1)
      .send({ action: { type: "teleport" } });
    expect(res.status).toBe(400);
  });

  it("processes skip actions and advances to pre_combat", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    const res = await skipToPreCombat(P1);

    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe("pre_combat");
  });

  it("returns 409 for actions on a finished session", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: "critical_crystal" });

    const phase = await driveToTerminal(P1);
    expect(["victory", "game_over"]).toContain(phase);

    const after = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("X-Player-Id", P1)
      .send({ action: { type: "skip" } });
    expect(after.status).toBe(409);
  });

  it("triggers combat on start_combat and returns serialized combatState", async () => {
    await createAndSkipToPreCombat(P1);

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("X-Player-Id", P1)
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
    await createAndSkipToPreCombat(P1);

    await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("X-Player-Id", P1)
      .send({ action: { type: "start_combat" } });

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("X-Player-Id", P1)
      .send({ action: { type: "end_combat" } });

    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe("encounter");
    expect(res.body.session.round).toBe(2);
    expect(res.body.session.wins + res.body.session.losses).toBe(1);
  });
});

describe("DELETE /api/v1/sessions/current", () => {
  it("returns 404 when no session exists", async () => {
    const res = await request(app)
      .delete("/api/v1/sessions/current")
      .set("X-Player-Id", P1);
    expect(res.status).toBe(404);
  });

  it("deletes the active session and returns 204", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .set("X-Player-Id", P1)
      .send({ crystalId: CRYSTAL });

    const res = await request(app)
      .delete("/api/v1/sessions/current")
      .set("X-Player-Id", P1);
    expect(res.status).toBe(204);

    // Subsequent get returns 404
    const getRes = await request(app)
      .get("/api/v1/sessions/current")
      .set("X-Player-Id", P1);
    expect(getRes.status).toBe(404);
  });
});

// --- helpers ---

async function createAndSkipToPreCombat(playerId: string) {
  await request(app)
    .post("/api/v1/sessions")
    .set("X-Player-Id", playerId)
    .send({ crystalId: CRYSTAL });
  await skipToPreCombat(playerId);
}

/** The run starts at encounter/step 1; two skips land on pre_combat/step 3. */
async function skipToPreCombat(playerId: string) {
  let res = await request(app)
    .post("/api/v1/sessions/current/actions")
    .set("X-Player-Id", playerId)
    .send({ action: { type: "skip" } });
  expect(res.status).toBe(200);
  res = await request(app)
    .post("/api/v1/sessions/current/actions")
    .set("X-Player-Id", playerId)
    .send({ action: { type: "skip" } });
  expect(res.status).toBe(200);
  return res;
}

/** Play a run to a terminal phase (victory or game_over), returning that phase. */
async function driveToTerminal(playerId: string): Promise<string> {
  let phase = "encounter";
  for (let i = 0; i < 100; i++) {
    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("X-Player-Id", playerId)
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
    if (phase === "victory" || phase === "game_over") return phase;
  }
  throw new Error(`Run did not reach a terminal phase (stuck at '${phase}')`);
}
