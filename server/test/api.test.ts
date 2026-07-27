/**
 * HTTP integration tests for session API endpoints.
 */
/// <reference types="jest" />

import request from "supertest";
import { createApp } from "../src/app";
import { _reset } from "../src/persistence/memory";

const app = createApp();

beforeEach(() => {
  _reset();
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("POST /api/v1/sessions", () => {
  it("creates a new session and returns 201", async () => {
    const res = await request(app)
      .post("/api/v1/sessions")
      .send({ crystalId: "critical_crystal" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("phase", "encounter");
    expect(res.body).toHaveProperty("round", 1);
    expect(res.body.team.units).toHaveLength(1); // crystal core
  });

  it("replaces an existing session", async () => {
    const first = await request(app)
      .post("/api/v1/sessions")
      .send({});

    const second = await request(app)
      .post("/api/v1/sessions")
      .send({});

    expect(second.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
  });
});

describe("GET /api/v1/sessions/current", () => {
  it("returns 404 when no session exists", async () => {
    const res = await request(app).get("/api/v1/sessions/current");
    expect(res.status).toBe(404);
  });

  it("returns the active session after creation", async () => {
    await request(app).post("/api/v1/sessions").send({});

    const res = await request(app).get("/api/v1/sessions/current");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("phase", "encounter");
  });
});

describe("POST /api/v1/sessions/current/actions", () => {
  it("returns 404 when no session exists", async () => {
    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .send({ action: { type: "skip" } });

    expect(res.status).toBe(404);
  });

  it("returns 400 for missing action", async () => {
    await request(app).post("/api/v1/sessions").send({});

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .send({});

    expect(res.status).toBe(400);
  });

  it("processes a skip action and advances the phase", async () => {
    await request(app)
      .post("/api/v1/sessions")
      .send({ crystalId: "critical_crystal" });

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .send({ action: { type: "skip" } });

    expect(res.status).toBe(200);
    expect(res.body.session).toHaveProperty("phase");
    // skip should advance to the next phase
    expect(["shop", "orb_shop", "pre_combat"]).toContain(res.body.session.phase);
  });

  it("triggers combat on start_combat and returns combatState", async () => {
    // Create session and skip to pre_combat
    await request(app)
      .post("/api/v1/sessions")
      .send({ crystalId: "critical_crystal" });

    // Skip through encounters until we hit pre_combat
    let phase = "encounter";
    while (phase !== "pre_combat") {
      const skipRes = await request(app)
        .post("/api/v1/sessions/current/actions")
        .send({ action: { type: "skip" } });
      phase = skipRes.body.session.phase;
    }

    const res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .send({ action: { type: "start_combat" } });

    expect(res.status).toBe(200);
    expect(res.body.session.phase).toBe("combat");
    expect(res.body.combatState).toBeDefined();
    expect(res.body.combatState).toHaveProperty("logs");
    expect(typeof res.body.combatState.wonCombat).toBe("boolean");
  });
});

describe("DELETE /api/v1/sessions/current", () => {
  it("returns 404 when no session exists", async () => {
    const res = await request(app).delete("/api/v1/sessions/current");
    expect(res.status).toBe(404);
  });

  it("deletes the active session and returns 204", async () => {
    await request(app).post("/api/v1/sessions").send({});

    const res = await request(app).delete("/api/v1/sessions/current");
    expect(res.status).toBe(204);

    // Subsequent get returns 404
    const getRes = await request(app).get("/api/v1/sessions/current");
    expect(getRes.status).toBe(404);
  });
});
