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
  createMemoryIdempotencyRepo,
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

  it("runs from creation to a terminal phase", async () => {
    const session = (await service.createSession(playerId, {
      crystalId: "critical_crystal",
    }));

    expect(session.phase).toBe("encounter");
    expect(session.session_type).toEqual({
      type: "multiplayer",
      queueType: "casual",
    });
    expect(session.id).not.toBe("");
    expect((await repo.get(playerId))).not.toBeNull();

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

      const result = (await service.handleAction(playerId, action));
      phase = result.session.phase;
      actions++;
    }

    expect(["victory", "game_over"]).toContain(phase);

    // Every combat was resolved: the run persisted in the repo.
    const finalSession = (await repo.get(playerId))!;
    expect(finalSession.wins + finalSession.losses).toBeGreaterThan(0);
    expect(finalSession.action_log.length).toBeGreaterThan(0);
  });

  it("no longer serves a finished session (getSession → null)", async () => {
    (await service.createSession(playerId, { crystalId: "critical_crystal" }));
    const finalSession = await driveToTerminal(service, playerId);
    expect(["victory", "game_over"]).toContain(finalSession.phase);

    // The terminal session is returned once in the action response; from then
    // on the server does not serve the finished run (the player can only
    // create a new session).
    expect((await service.getSession(playerId))).toBeNull();
  });

  it("allows creating a new session after a run finished", async () => {
    (await service.createSession(playerId, { crystalId: "critical_crystal" }));
    const finished = await driveToTerminal(service, playerId);
    expect(["victory", "game_over"]).toContain(finished.phase);

    // No client-side delete: the server owns the lifecycle, so a finished run
    // does not block (or linger as) a new active session.
    const next = (await service.createSession(playerId, { crystalId: "mana_crystal" }));
    expect(next.phase).toBe("encounter");
    expect(next.id).not.toBe(finished.id);
    expect((await service.getSession(playerId))?.id).toBe(next.id);
  });

  it("refuses a second active session per player", async () => {
    (await service.createSession(playerId, { crystalId: "critical_crystal" }));

    await expect(service.createSession(playerId, { crystalId: "mana_crystal" }),
    ).rejects.toThrow(expect.objectContaining({ status: 409 }));
  });

  it("returns a 404-style error when no session exists", async () => {
    await expect(service.handleAction("nobody", { type: "skip" }),
    ).rejects.toThrow(expect.objectContaining({ status: 404 }));
  });

  it("rejects actions once a session reaches a terminal phase", async () => {
    const session = (await service.createSession(playerId, {
      crystalId: "critical_crystal",
    }));
    session.phase = "victory";
    (await repo.upsert(playerId, session));

    await expect(service.handleAction(playerId, { type: "skip" }),
    ).rejects.toThrow(expect.objectContaining({ status: 409 }));
  });

  it("records actions in the action log", async () => {
    (await service.createSession(playerId, { crystalId: "critical_crystal" }));
    (await service.handleAction(playerId, { type: "skip" }));

    const session = (await repo.get(playerId))!;
    expect(session.action_log).toHaveLength(1);
    expect(session.action_log[0].action).toBe("skip");
  });

  it("maps core rejection of invalid actions to a 422", async () => {
    (await service.createSession(playerId, { crystalId: "critical_crystal" }));

    // end_combat without a prior start_combat is rejected by core.
    await expect(service.handleAction(playerId, { type: "end_combat" }),
    ).rejects.toThrow(expect.objectContaining({ status: 422 }));
  });

  it("initializes a default rating (1000) on session creation", async () => {
    (await service.createSession(playerId, { crystalId: "critical_crystal" }));

    expect((await ratingRepo.get(playerId))).toEqual({
      playerId,
      rating: 1000,
      updatedAt: expect.any(Number),
    });
  });

  it("snapshots a ghost per round on start_combat", async () => {
    (await service.createSession(playerId, { crystalId: "critical_crystal" }));
    const finalSession = await driveToTerminal(service, playerId);

    // Every fought round (1..final round) has exactly one ghost from this run,
    // sanitized (CPU force) and rated at the player's default rating.
    for (let round = 1; round <= finalSession.round; round++) {
      const ghosts = (await ghostRepo.findByRound(round));
      expect(ghosts).toHaveLength(1);
      expect(ghosts[0].playerId).toBe(playerId);
      expect(ghosts[0].rating).toBe(1000);
      expect(ghosts[0].team.length).toBeGreaterThan(0);
      expect(ghosts[0].team.every((unit) => unit.force === "CPU")).toBe(true);
    }
  });

  it("applies the rating delta exactly once on run completion", async () => {
    (await service.createSession(playerId, { crystalId: "critical_crystal" }));
    const finalSession = await driveToTerminal(service, playerId);

    const expected = 1000 + getMultiplayerRatingDelta(finalSession.wins);
    expect((await ratingRepo.get(playerId))?.rating).toBe(expected);

    // A duplicate end_combat on the finished run is rejected (409) and the
    // rating is NOT applied a second time.
    await expect(service.handleAction(playerId, { type: "end_combat" }),
    ).rejects.toThrow(expect.objectContaining({ status: 409 }));
    expect((await ratingRepo.get(playerId))?.rating).toBe(expected);
  });

  it("records a run completion exactly once for the lobby stats", async () => {
    (await service.createSession(playerId, { crystalId: "critical_crystal" }));
    const finalSession = await driveToTerminal(service, playerId);

    // Exactly one completion row for this run, tier derived from its wins.
    const career = (await playerStatsRepo.getVictoryCounts(playerId, 0));
    const tier = getMultiplayerVictoryTier(finalSession.wins);
    if (tier === null) {
      expect(career).toEqual({ bronze: 0, silver: 0, gold: 0 });
    } else {
      expect(career[tier]).toBe(1);
    }

    // Re-dispatching on the finished run is rejected; the repo is additionally
    // idempotent per session id, so the count can never double.
    await expect(service.handleAction(playerId, { type: "end_combat" }),
    ).rejects.toThrow(expect.objectContaining({ status: 409 }));
    const after = (await playerStatsRepo.getVictoryCounts(playerId, 0));
    expect(after).toEqual(career);
  });
});

/**
 * Drive a run to a terminal phase via skip/start_combat/end_combat. Returns
 * the terminal session as seen in the action response (the server does not
 * serve finished sessions via getSession).
 */
async function driveToTerminal(
  service: SessionService,
  playerId: string,
): Promise<SessionData> {
  const initial = await service.getSession(playerId);
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

    const result = (await service.handleAction(playerId, action));
    finalSession = result.session;
    phase = result.session.phase;
    actions++;
  }

  expect(["victory", "game_over"]).toContain(finalSession.phase);
  return finalSession;
}

describe("action idempotency (clientActionId)", () => {
  let repo: SessionRepo;
  let service: SessionService;
  const playerId = "idem-player";

  beforeEach(() => {
    repo = createMemorySessionRepo();
    service = createSessionService(repo, {
      ghostRepo: createMemoryGhostRepo(),
      ratingRepo: createMemoryRatingRepo(),
      playerRepo: createMemoryPlayerRepo(),
      playerStatsRepo: createMemoryPlayerStatsRepo(),
      idempotencyRepo: createMemoryIdempotencyRepo(),
    });
  });

  it("replays the stored response on retry instead of re-running", async () => {
    await service.createSession(playerId, { crystalId: "critical_crystal" });

    const first = await service.handleAction(
      playerId,
      { type: "skip" },
      "key-1",
    );
    const second = await service.handleAction(
      playerId,
      { type: "skip" },
      "key-1",
    );

    expect(second.session.id).toBe(first.session.id);
    expect(second.session.action_log).toHaveLength(1);
    // The transition ran once — the stored session has a single audit entry.
    const live = (await repo.get(playerId))!;
    expect(live.action_log).toHaveLength(1);
  });

  it("treats distinct keys as distinct attempts", async () => {
    await service.createSession(playerId, { crystalId: "critical_crystal" });

    await service.handleAction(playerId, { type: "skip" }, "key-1");
    await service.handleAction(playerId, { type: "skip" }, "key-2");

    const live = (await repo.get(playerId))!;
    expect(live.action_log).toHaveLength(2);
  });

  it("replays combat bytes identically", async () => {
    await service.createSession(playerId, { crystalId: "critical_crystal" });
    // Drive to pre_combat without fighting.
    for (let i = 0; i < 50; i++) {
      const current = (await service.getSession(playerId))!;
      if (current.phase === "pre_combat") break;
      const action: Action =
        current.phase === "combat" ? { type: "end_combat" } : { type: "skip" };
      await service.handleAction(playerId, action);
    }
    expect((await service.getSession(playerId))?.phase).toBe("pre_combat");

    const first = await service.handleAction(
      playerId,
      { type: "start_combat" },
      "combat-key",
    );
    const second = await service.handleAction(
      playerId,
      { type: "start_combat" },
      "combat-key",
    );

    expect(first.combatState).toBeDefined();
    expect(second.combatState?.wonCombat).toBe(first.combatState?.wonCombat);
    expect(second.combatState?.enemyPlayerName).toBe(
      first.combatState?.enemyPlayerName,
    );
    expect(second.session.action_log).toHaveLength(
      first.session.action_log.length,
    );
    const live = (await repo.get(playerId))!;
    expect(
      live.action_log.filter((entry) => entry.action === "start_combat"),
    ).toHaveLength(1);
  });
});
