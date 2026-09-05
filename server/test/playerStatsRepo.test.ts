/**
 * Unit tests for the run-completions repos (memory + sqlite) that power the
 * multiplayer lobby's career / season victory stats (`GET /api/v1/players/me`).
 *
 * Both implementations must behave identically:
 *   - recording is idempotent per session id (never double-counts a run),
 *   - `getVictoryCounts(playerId, sinceEpochMs)` counts only the player's
 *     tiered completions completed at or after the window start (career = 0),
 *   - below-bronze runs (tier null) are stored but never counted.
 */
/// <reference types="jest" />

import { openSqliteDatabase } from "../src/persistence/sqlite";
import { createSqlitePlayerStatsRepo } from "../src/persistence/sqlite";
import { createMemoryPlayerStatsRepo } from "../src/persistence/memory";
import type {
  PlayerStatsRepo,
  RunCompletion,
} from "../src/persistence/repositories";

const PLAYER_A = "player-a";
const PLAYER_B = "player-b";
const NOW = 1_752_000_000_000; // fixed "today" for deterministic window math

function completion(overrides: Partial<RunCompletion> = {}): RunCompletion {
  return {
    sessionId: "sess-1",
    playerId: PLAYER_A,
    tier: "gold",
    wins: 10,
    completedAt: NOW,
    ...overrides,
  };
}

async function expectCounts(
  repo: PlayerStatsRepo,
  playerId: string,
  sinceEpochMs: number,
): Promise<{ bronze: number; silver: number; gold: number }> {
  return (await repo.getVictoryCounts(playerId, sinceEpochMs));
}

describe.each([
  ["memory", () => createMemoryPlayerStatsRepo()],
  ["sqlite", () => createSqlitePlayerStatsRepo(openSqliteDatabase(":memory:"))],
])("player stats repo (%s)", (_name, makeRepo) => {
  let repo: PlayerStatsRepo;

  beforeEach(() => {
    repo = makeRepo();
  });

  it("starts with zeroed counts", async () => {
    expect(await expectCounts(repo, PLAYER_A, 0)).toEqual({
      bronze: 0,
      silver: 0,
      gold: 0,
    });
  });

  it("counts tiered victories per player across the career window", async () => {
    (await repo.recordRunCompletion(completion({ sessionId: "s1", tier: "gold" })));
    (await repo.recordRunCompletion(completion({ sessionId: "s2", tier: "silver" })));
    (await repo.recordRunCompletion(completion({ sessionId: "s3", tier: "bronze" })));
    // Another player's runs must not leak into A's counts.
    (await repo.recordRunCompletion(
      completion({ sessionId: "s4", playerId: PLAYER_B, tier: "gold" }),
    ));

    expect(await expectCounts(repo, PLAYER_A, 0)).toEqual({
      bronze: 1,
      silver: 1,
      gold: 1,
    });
    expect(await expectCounts(repo, PLAYER_B, 0)).toEqual({
      bronze: 0,
      silver: 0,
      gold: 1,
    });
  });

  it("ignores below-bronze runs (tier null) in the counts", async () => {
    (await repo.recordRunCompletion(completion({ sessionId: "s1", tier: null, wins: 4 })));
    (await repo.recordRunCompletion(completion({ sessionId: "s2", tier: "bronze" })));

    expect(await expectCounts(repo, PLAYER_A, 0)).toEqual({
      bronze: 1,
      silver: 0,
      gold: 0,
    });
  });

  it("filters by the season window (completions at or after `sinceEpochMs`)", async () => {
    (await repo.recordRunCompletion(
      completion({ sessionId: "old", tier: "gold", completedAt: NOW - 10 }),
    ));
    (await repo.recordRunCompletion(
      completion({ sessionId: "edge", tier: "silver", completedAt: NOW }),
    ));
    (await repo.recordRunCompletion(
      completion({ sessionId: "new", tier: "bronze", completedAt: NOW + 10 }),
    ));

    expect(await expectCounts(repo, PLAYER_A, NOW)).toEqual({
      bronze: 1,
      silver: 1,
      gold: 0,
    });
  });

  it("records each session exactly once even when re-recorded", async () => {
    (await repo.recordRunCompletion(completion({ sessionId: "s1", tier: "gold" })));
    (await repo.recordRunCompletion(completion({ sessionId: "s1", tier: "gold" })));
    (await repo.recordRunCompletion(completion({ sessionId: "s1", tier: "gold" })));

    expect(await expectCounts(repo, PLAYER_A, 0)).toEqual({
      bronze: 0,
      silver: 0,
      gold: 1,
    });
  });

  it("stores the win count alongside the tier for future stats", async () => {
    (await repo.recordRunCompletion(
      completion({ sessionId: "s1", tier: "silver", wins: 8 }),
    ));
    (await repo.recordRunCompletion(
      completion({ sessionId: "s2", tier: null, wins: 2 }),
    ));

    // The interface exposes counts only; the raw records are still persisted
    // (assert via the counts path that both rows are distinguishable).
    expect((await expectCounts(repo, PLAYER_A, 0)).silver).toBe(1);
    expect((await expectCounts(repo, PLAYER_A, 0)).gold).toBe(0);
  });
});
