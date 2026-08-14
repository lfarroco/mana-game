/**
 * Unit tests for the matchmaking service — ghost snapshots, opponent pick
 * (rating band + self/recent exclusions), band widening, and the PvE
 * fallback that guarantees a match.
 */
/// <reference types="jest" />

import type { Unit } from "@game/types/unit";
import type { Ghost } from "../src/persistence/repositories";
import { createMemoryGhostRepo } from "../src/persistence/memory";
import {
  GUEST_ENEMY_NAME,
  hasValidCombatTeam,
  normalizePlayerRating,
  pickOpponent,
  PVE_ENEMY_NAME,
  resolveOpponent,
  sanitizeEnemyTeam,
  snapshotGhost,
} from "../src/services/matchmaking";

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: "unit-1",
    cardId: "mana_crystal",
    pic: "",
    force: "PLAYER",
    position: [0, 0],
    rank: 1,
    power: 0,
    bonusPower: 0,
    life: 100,
    maxLife: 100,
    shield: 0,
    cooldown: 1000,
    evade: 0,
    effects: [],
    reactions: [],
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
    isCore: true,
    ...overrides,
  };
}

function makeGhost(overrides: Partial<Ghost> = {}): Ghost {
  return {
    ghostId: "ghost-1",
    playerId: "opponent-a",
    sessionId: "session-1",
    round: 1,
    team: [makeUnit()],
    rating: 1000,
    createdAt: 1,
    ...overrides,
  };
}

describe("snapshotGhost", () => {
  it("normalizes a valid team into a storable ghost", () => {
    const ghost = snapshotGhost({
      playerId: "player-1",
      sessionId: "session-1",
      round: 3,
      team: [makeUnit({ life: 50 })], // damaged unit snapshot
      rating: 1234.9,
      createdAt: 42,
    });

    expect(ghost).not.toBeNull();
    expect(ghost).toMatchObject({
      playerId: "player-1",
      sessionId: "session-1",
      round: 3,
      rating: 1234,
      createdAt: 42,
    });
    // The stored team is sanitized: CPU force and full life.
    expect(ghost!.team[0].force).toBe("CPU");
    expect(ghost!.team[0].life).toBe(ghost!.team[0].maxLife);
  });

  it("returns null for round < 1", () => {
    expect(
      snapshotGhost({
        playerId: "p",
        sessionId: "s",
        round: 0,
        team: [makeUnit()],
        rating: 1000,
        createdAt: 1,
      }),
    ).toBeNull();
  });

  it("returns null for an empty team", () => {
    expect(
      snapshotGhost({
        playerId: "p",
        sessionId: "s",
        round: 1,
        team: [],
        rating: 1000,
        createdAt: 1,
      }),
    ).toBeNull();
  });

  it("returns null for a team without a core unit", () => {
    expect(
      snapshotGhost({
        playerId: "p",
        sessionId: "s",
        round: 1,
        team: [makeUnit({ isCore: false })],
        rating: 1000,
        createdAt: 1,
      }),
    ).toBeNull();
  });
});

describe("sanitizeEnemyTeam", () => {
  it("clamps positions to the 3x3 board", () => {
    const team = sanitizeEnemyTeam([
      makeUnit({ position: [5, -2] }),
      makeUnit({ id: "u2", position: [0, 7] }),
    ]);
    expect(team[0].position).toEqual([2, 0]);
    expect(team[1].position).toEqual([0, 2]);
  });

  it("rewrites ids, forces CPU, and restores full life", () => {
    const team = sanitizeEnemyTeam([
      makeUnit({ id: "u1", cardId: "critical_crystal", life: 30, maxLife: 90 }),
    ]);
    expect(team[0].id).toBe("match-critical_crystal-0");
    expect(team[0].force).toBe("CPU");
    expect(team[0].life).toBe(90);
  });
});

describe("hasValidCombatTeam", () => {
  it("accepts a team that carries a core", () => {
    expect(hasValidCombatTeam([makeUnit(), makeUnit({ id: "u2" })])).toBe(true);
  });

  it("rejects empty teams and teams without a core", () => {
    expect(hasValidCombatTeam([])).toBe(false);
    expect(hasValidCombatTeam([makeUnit({ isCore: false })])).toBe(false);
  });
});

describe("normalizePlayerRating", () => {
  it("floors values and falls back on garbage", () => {
    expect(normalizePlayerRating(1234.9)).toBe(1234);
    expect(normalizePlayerRating(NaN)).toBe(1000);
    expect(normalizePlayerRating(-5)).toBe(1000);
    expect(normalizePlayerRating(undefined)).toBe(1000);
    expect(normalizePlayerRating(undefined, 500)).toBe(500);
  });
});

describe("pickOpponent", () => {
  const base = {
    playerId: "me",
    rating: 1000,
    round: 1,
    ratingBand: 150,
  };

  it("returns the closest ghost within the band", () => {
    const far = makeGhost({ ghostId: "g-far", playerId: "a", rating: 850 });
    const close = makeGhost({ ghostId: "g-close", playerId: "b", rating: 950 });

    expect(pickOpponent({ ghosts: [far, close], ...base })?.ghostId).toBe(
      "g-close",
    );
  });

  it("excludes the player's own ghosts", () => {
    const self = makeGhost({ ghostId: "g-self", playerId: "me", rating: 1000 });
    expect(pickOpponent({ ghosts: [self], ...base })).toBeNull();
  });

  it("excludes recently-fought opponents", () => {
    const ghost = makeGhost({ ghostId: "g-recent", playerId: "a" });
    expect(
      pickOpponent({ ghosts: [ghost], recentlyFought: ["a"], ...base }),
    ).toBeNull();
  });

  it("filters by round", () => {
    const otherRound = makeGhost({ ghostId: "g-r2", round: 2 });
    expect(pickOpponent({ ghosts: [otherRound], ...base })).toBeNull();
  });

  it("filters by the rating band", () => {
    const outOfBand = makeGhost({ ghostId: "g-far", rating: 1300 });
    expect(pickOpponent({ ghosts: [outOfBand], ...base })).toBeNull();
    // Same ghost is found when the band is wide enough.
    expect(
      pickOpponent({ ...base, ghosts: [outOfBand], ratingBand: 300 })?.ghostId,
    ).toBe("g-far");
  });

  it("breaks ties deterministically (lower rating, then player id)", () => {
    const equidistantA = makeGhost({
      ghostId: "g-a",
      playerId: "player-z",
      rating: 1100,
    });
    const equidistantB = makeGhost({
      ghostId: "g-b",
      playerId: "player-a",
      rating: 900,
    });
    const equidistantC = makeGhost({
      ghostId: "g-c",
      playerId: "player-b",
      rating: 900,
    });
    // 900 beats 1100 on the lower-rating tie-break; then player-a beats player-b.
    expect(
      pickOpponent({
        ghosts: [equidistantA, equidistantB, equidistantC],
        ...base,
      })?.ghostId,
    ).toBe("g-b");
  });
});


describe("resolveOpponent", () => {
  const base = {
    playerId: "me",
    rating: 1000,
    round: 1,
    wins: 3,
    seed: "seed-1",
  };

  it("resolves a ghost pick with the owner's display name", () => {
    const ghost = makeGhost({ ghostId: "g-1", playerId: "opponent-a" });
    const resolution = resolveOpponent({
      ghosts: [ghost],
      displayNameFor: () => "Steam Player",
      ...base,
    });

    expect(resolution).toEqual({
      enemyTeam: expect.any(Array),
      enemyPlayerName: "Steam Player",
      ghostId: "g-1",
      opponentPlayerId: "opponent-a",
    });
    expect(resolution.enemyTeam.length).toBeGreaterThan(0);
  });

  it("falls back to Guest when the ghost owner has no display name", () => {
    const resolution = resolveOpponent({
      ghosts: [makeGhost()],
      ...base,
    });
    expect(resolution.enemyPlayerName).toBe(GUEST_ENEMY_NAME);
    expect(resolution.opponentPlayerId).toBe("opponent-a");
  });

  it("widens the rating band on repeated misses until a match is found", () => {
    // Distance 500: bands 150 (miss), 300 (miss), 450 (miss), 600 (hit).
    const farGhost = makeGhost({ ghostId: "g-far", playerId: "far", rating: 500 });
    const resolution = resolveOpponent({ ghosts: [farGhost], ...base });

    expect(resolution.ghostId).toBe("g-far");
    expect(resolution.opponentPlayerId).toBe("far");
  });

  it("gives up to PvE when the band never reaches the ghost", () => {
    // Distance 700 exceeds the max widened band (150 + 3*150 = 600).
    const farGhost = makeGhost({ ghostId: "g-far", rating: 300 });
    const resolution = resolveOpponent({ ghosts: [farGhost], ...base });

    expect(resolution.ghostId).toBeNull();
    expect(resolution.opponentPlayerId).toBeNull();
    expect(resolution.enemyPlayerName).toBe(PVE_ENEMY_NAME);
    expect(resolution.enemyTeam.length).toBeGreaterThan(0);
  });

  it("falls back to a generated PvE team when no ghosts exist", () => {
    const resolution = resolveOpponent({ ghosts: [], ...base });

    expect(resolution.ghostId).toBeNull();
    expect(resolution.opponentPlayerId).toBeNull();
    expect(resolution.enemyPlayerName).toBe(PVE_ENEMY_NAME);
    expect(resolution.enemyTeam.length).toBeGreaterThan(0);
    expect(resolution.enemyTeam.every((u) => u.force === "CPU")).toBe(true);
  });

  it("falls back to PvE when every ghost is self or recently fought", () => {
    const self = makeGhost({ ghostId: "g-self", playerId: "me" });
    const recent = makeGhost({ ghostId: "g-recent", playerId: "recent-foe" });
    const resolution = resolveOpponent({
      ghosts: [self, recent],
      recentlyFought: ["recent-foe"],
      ...base,
    });

    expect(resolution.ghostId).toBeNull();
    expect(resolution.enemyPlayerName).toBe(PVE_ENEMY_NAME);
  });

  it("respects a caller-supplied starting band and widen step", () => {
    // Distance 250: base band 100 misses; step 100 → 200 misses; 300 hits.
    const ghost = makeGhost({ ghostId: "g-mid", playerId: "mid", rating: 750 });
    const resolution = resolveOpponent({
      ghosts: [ghost],
      ratingBand: 100,
      bandWidenStep: 100,
      ...base,
    });

    expect(resolution.ghostId).toBe("g-mid");
  });
});


describe("createMemoryGhostRepo", () => {
  it("caps the recently-fought list per player (FIFO)", () => {
    const ghostRepo = createMemoryGhostRepo();

    for (let i = 1; i <= 25; i++) {
      ghostRepo.recordMatchup("me", `opponent-${i}`);
    }

    const recent = ghostRepo.getRecentOpponents("me");
    expect(recent).toHaveLength(20);
    // Oldest entries fell off; the newest are kept (most recent last).
    expect(recent[0]).toBe("opponent-6");
    expect(recent[recent.length - 1]).toBe("opponent-25");
    expect(recent).not.toContain("opponent-1");
  });

  it("dedupes a re-fought opponent to the front of the list", () => {
    const ghostRepo = createMemoryGhostRepo();
    ghostRepo.recordMatchup("me", "a");
    ghostRepo.recordMatchup("me", "b");
    ghostRepo.recordMatchup("me", "a");

    expect(ghostRepo.getRecentOpponents("me")).toEqual(["b", "a"]);
  });
});

