/**
 * Full-run flow test against the session service (revives the old
 * server/ FullSessionFlow tests).
 *
 * Exercises the whole lifecycle through the service + in-memory repo:
 * create session → encounters (skip) → pre_combat → start_combat →
 * end_combat → next round → … → terminal phase (victory or game_over).
 */
/// <reference types="jest" />

import type { Action } from "@game/types/action";
import { createMemorySessionRepo } from "../src/persistence/memory";
import type { SessionRepo } from "../src/persistence/repositories";
import {
  createSessionService,
  type SessionService,
} from "../src/services/sessionService";

describe("session flow", () => {
  let repo: SessionRepo;
  let service: SessionService;
  const playerId = "flow-player";

  beforeEach(() => {
    repo = createMemorySessionRepo();
    service = createSessionService(repo);
  });

  it("runs from creation to a terminal phase", () => {
    const session = service.createSession(playerId, {
      crystalId: "critical_crystal",
    });

    expect(session.phase).toBe("encounter");
    expect(session.session_type).toEqual({
      type: "multiplayer",
      queueType: "casual",
    });
    expect(session.id).not.toBe("");
    expect(repo.get(playerId)).not.toBeNull();

    let phase = session.phase;
    let actions = 0;
    const maxActions = 100;

    while (
      phase !== "victory" &&
      phase !== "game_over" &&
      actions < maxActions
    ) {
      const action: Action =
        phase === "combat"
          ? { type: "end_combat" }
          : phase === "pre_combat"
            ? { type: "start_combat" }
            : { type: "skip" };

      const result = service.handleAction(playerId, action);
      phase = result.session.phase;
      actions++;
    }

    expect(["victory", "game_over"]).toContain(phase);

    // Every combat was resolved: the run persisted in the repo.
    const finalSession = repo.get(playerId)!;
    expect(finalSession.wins + finalSession.losses).toBeGreaterThan(0);
    expect(finalSession.action_log.length).toBeGreaterThan(0);
  });

  it("refuses a second active session per player", () => {
    service.createSession(playerId, { crystalId: "critical_crystal" });

    expect(() =>
      service.createSession(playerId, { crystalId: "mana_crystal" }),
    ).toThrow(expect.objectContaining({ status: 409 }));
  });

  it("returns a 404-style error when no session exists", () => {
    expect(() => service.handleAction("nobody", { type: "skip" })).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it("rejects actions once a session reaches a terminal phase", () => {
    const session = service.createSession(playerId, {
      crystalId: "critical_crystal",
    });
    session.phase = "victory";
    repo.upsert(playerId, session);

    expect(() => service.handleAction(playerId, { type: "skip" })).toThrow(
      expect.objectContaining({ status: 409 }),
    );
  });

  it("records actions in the action log", () => {
    service.createSession(playerId, { crystalId: "critical_crystal" });
    service.handleAction(playerId, { type: "skip" });

    const session = repo.get(playerId)!;
    expect(session.action_log).toHaveLength(1);
    expect(session.action_log[0].action).toBe("skip");
  });

  it("maps core rejection of invalid actions to a 422", () => {
    service.createSession(playerId, { crystalId: "critical_crystal" });

    // end_combat without a prior start_combat is rejected by core.
    expect(() =>
      service.handleAction(playerId, { type: "end_combat" }),
    ).toThrow(expect.objectContaining({ status: 422 }));
  });
});
