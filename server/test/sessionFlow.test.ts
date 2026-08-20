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
import type { SessionData } from "@game/types/session";
import {
  createMemoryGhostRepo,
  createMemoryPlayerRepo,
  createMemoryPlayerStatsRepo,
  createMemoryRatingRepo,
  createMemorySessionRepo,
} from "../src/persistence/memory";
import type {
  GhostRepo,
  PlayerRepo,
  PlayerStatsRepo,
  RatingRepo,
  SessionRepo,
} from "../src/persistence/repositories";
import {
  createSessionService,
  type SessionService,
} from "../src/services/sessionService";
import { getMultiplayerRatingDelta, getMultiplayerVictoryTier } from "../src/services/rating";

describe("session flow", () => {
  let repo: SessionRepo;
  let ghostRepo: GhostRepo;
  let ratingRepo: RatingRepo;
  let playerRepo: PlayerRepo;
  let playerStatsRepo: PlayerStatsRepo;
  let service: SessionService;
  const playerId = "flow-player";

  beforeEach(() => {
    repo = createMemorySessionRepo();
    ghostRepo = createMemoryGhostRepo();
    ratingRepo = createMemoryRatingRepo();
    playerRepo = createMemoryPlayerRepo();
    playerStatsRepo = createMemoryPlayerStatsRepo();
    service = createSessionService(repo, {
      ghostRepo,
      ratingRepo,
      playerRepo,
      playerStatsRepo,
    });
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

  it("no longer serves a finished session (getSession → null)", () => {
    service.createSession(playerId, { crystalId: "critical_crystal" });
    const finalSession = driveToTerminal(service, playerId);
    expect(["victory", "game_over"]).toContain(finalSession.phase);

    // The terminal session is returned once in the action response; from then
    // on the server does not serve the finished run (the player can only
    // create a new session).
    expect(service.getSession(playerId)).toBeNull();
  });

  it("allows creating a new session after a run finished", () => {
    service.createSession(playerId, { crystalId: "critical_crystal" });
    const finished = driveToTerminal(service, playerId);
    expect(["victory", "game_over"]).toContain(finished.phase);

    // No client-side delete: the server owns the lifecycle, so a finished run
    // does not block (or linger as) a new active session.
    const next = service.createSession(playerId, { crystalId: "mana_crystal" });
    expect(next.phase).toBe("encounter");
    expect(next.id).not.toBe(finished.id);
    expect(service.getSession(playerId)?.id).toBe(next.id);
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

  it("initializes a default rating (1000) on session creation", () => {
    service.createSession(playerId, { crystalId: "critical_crystal" });

    expect(ratingRepo.get(playerId)).toEqual({
      playerId,
      rating: 1000,
      updatedAt: expect.any(Number),
    });
  });

  it("snapshots a ghost per round on start_combat", () => {
    service.createSession(playerId, { crystalId: "critical_crystal" });
    const finalSession = driveToTerminal(service, playerId);

    // Every fought round (1..final round) has exactly one ghost from this run,
    // sanitized (CPU force) and rated at the player's default rating.
    for (let round = 1; round <= finalSession.round; round++) {
      const ghosts = ghostRepo.findByRound(round);
      expect(ghosts).toHaveLength(1);
      expect(ghosts[0].playerId).toBe(playerId);
      expect(ghosts[0].rating).toBe(1000);
      expect(ghosts[0].team.length).toBeGreaterThan(0);
      expect(ghosts[0].team.every((unit) => unit.force === "CPU")).toBe(true);
    }
  });

  it("applies the rating delta exactly once on run completion", () => {
    service.createSession(playerId, { crystalId: "critical_crystal" });
    const finalSession = driveToTerminal(service, playerId);

    const expected = 1000 + getMultiplayerRatingDelta(finalSession.wins);
    expect(ratingRepo.get(playerId)?.rating).toBe(expected);

    // A duplicate end_combat on the finished run is rejected (409) and the
    // rating is NOT applied a second time.
    expect(() =>
      service.handleAction(playerId, { type: "end_combat" }),
    ).toThrow(expect.objectContaining({ status: 409 }));
    expect(ratingRepo.get(playerId)?.rating).toBe(expected);
  });

  it("records a run completion exactly once for the lobby stats", () => {
    service.createSession(playerId, { crystalId: "critical_crystal" });
    const finalSession = driveToTerminal(service, playerId);

    // Exactly one completion row for this run, tier derived from its wins.
    const career = playerStatsRepo.getVictoryCounts(playerId, 0);
    const tier = getMultiplayerVictoryTier(finalSession.wins);
    if (tier === null) {
      expect(career).toEqual({ bronze: 0, silver: 0, gold: 0 });
    } else {
      expect(career[tier]).toBe(1);
    }

    // Re-dispatching on the finished run is rejected; the repo is additionally
    // idempotent per session id, so the count can never double.
    expect(() =>
      service.handleAction(playerId, { type: "end_combat" }),
    ).toThrow(expect.objectContaining({ status: 409 }));
    const after = playerStatsRepo.getVictoryCounts(playerId, 0);
    expect(after).toEqual(career);
  });
});

/**
 * Drive a run to a terminal phase via skip/start_combat/end_combat. Returns
 * the terminal session as seen in the action response (the server does not
 * serve finished sessions via getSession).
 */
function driveToTerminal(
  service: SessionService,
  playerId: string,
): SessionData {
  const initial = service.getSession(playerId);
  if (!initial) {
    throw new Error("No active session to drive to a terminal phase");
  }

  let phase = initial.phase;
  let finalSession: SessionData = initial;
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
    finalSession = result.session;
    phase = result.session.phase;
    actions++;
  }

  expect(["victory", "game_over"]).toContain(finalSession.phase);
  return finalSession;
}
