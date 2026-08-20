/**
 * Unit tests for the player profile service — the payload behind the
 * multiplayer lobby's `GET /api/v1/players/me`.
 *
 * Covers the season boundary (1st of the current month, UTC), career vs
 * season counts, rating defaults, and the active-session flag.
 */
/// <reference types="jest" />

import type { SessionData } from "@game/types/session";
import {
  createMemoryPlayerRepo,
  createMemoryPlayerStatsRepo,
  createMemoryRatingRepo,
  createMemorySessionRepo,
} from "../src/persistence/memory";
import {
  getPlayerProfile,
  getSeasonStartEpochMs,
} from "../src/services/playerService";
import { DEFAULT_PLAYER_RATING } from "../src/services/rating";

const PLAYER_ID = "player-1";
const STEAM_ID = "76561198000000000";

function makeSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    id: "sess-1",
    player_id: PLAYER_ID,
    session_type: { type: "multiplayer", queueType: "casual" },
    phase: "encounter",
    round: 1,
    step: 0,
    seed: "seed",
    initial_seed: "seed",
    options: [],
    team: { units: [] },
    wins: 0,
    losses: 0,
    action_log: [],
    ...overrides,
  };
}

describe("getSeasonStartEpochMs", () => {
  it("returns the 1st of the current month at 00:00 UTC", () => {
    // 2026-08-20T15:30:00Z → 2026-08-01T00:00:00Z
    const start = getSeasonStartEpochMs(Date.UTC(2026, 7, 20, 15, 30));
    expect(start).toBe(Date.UTC(2026, 7, 1));
  });

  it("rolls over on the first day of a new month", () => {
    // 2026-09-01T00:00:01Z → 2026-09-01T00:00:00Z
    expect(getSeasonStartEpochMs(Date.UTC(2026, 8, 1, 0, 0, 1))).toBe(
      Date.UTC(2026, 8, 1),
    );
  });

  it("rolls over on January (year boundary)", () => {
    expect(getSeasonStartEpochMs(Date.UTC(2027, 0, 15))).toBe(
      Date.UTC(2027, 0, 1),
    );
  });
});

describe("getPlayerProfile", () => {
  function makeDeps() {
    const playerRepo = createMemoryPlayerRepo();
    playerRepo.create({
      playerId: PLAYER_ID,
      provider: "steam",
      providerId: STEAM_ID,
      displayName: "Momo",
      createdAt: Date.now(),
    });
    return {
      playerRepo,
      ratingRepo: createMemoryRatingRepo(),
      playerStatsRepo: createMemoryPlayerStatsRepo(),
      sessionRepo: createMemorySessionRepo(),
    };
  }

  it("returns identity, default rating, zeroed stats, and no active session for a new player", () => {
    const deps = makeDeps();
    const profile = getPlayerProfile(PLAYER_ID, deps);

    expect(profile.player).toEqual({
      playerId: PLAYER_ID,
      displayName: "Momo",
      providerId: STEAM_ID,
      provider: "steam",
    });
    expect(profile.rating).toBe(DEFAULT_PLAYER_RATING);
    expect(profile.career).toEqual({ bronze: 0, silver: 0, gold: 0 });
    expect(profile.season).toEqual({ bronze: 0, silver: 0, gold: 0 });
    expect(profile.hasActiveSession).toBe(false);
  });

  it("reports an active session for a mid-run phase and false for a finished run", () => {
    const deps = makeDeps();
    deps.sessionRepo.upsert(PLAYER_ID, makeSession({ phase: "combat" }));
    expect(getPlayerProfile(PLAYER_ID, deps).hasActiveSession).toBe(true);

    deps.sessionRepo.upsert(PLAYER_ID, makeSession({ phase: "victory" }));
    expect(getPlayerProfile(PLAYER_ID, deps).hasActiveSession).toBe(false);
  });

  it("separates career counts from the current-month season counts", () => {
    const deps = makeDeps();
    const now = Date.now();
    const seasonStart = getSeasonStartEpochMs(now);
    // Last month's gold (career-only) + this month's silver + bronze.
    deps.playerStatsRepo.recordRunCompletion({
      sessionId: "old-gold",
      playerId: PLAYER_ID,
      tier: "gold",
      wins: 10,
      completedAt: seasonStart - 1,
    });
    deps.playerStatsRepo.recordRunCompletion({
      sessionId: "season-silver",
      playerId: PLAYER_ID,
      tier: "silver",
      wins: 8,
      completedAt: now,
    });
    deps.playerStatsRepo.recordRunCompletion({
      sessionId: "season-bronze",
      playerId: PLAYER_ID,
      tier: "bronze",
      wins: 5,
      completedAt: now,
    });

    const profile = getPlayerProfile(PLAYER_ID, deps);
    expect(profile.career).toEqual({ bronze: 1, silver: 1, gold: 1 });
    expect(profile.season).toEqual({ bronze: 1, silver: 1, gold: 0 });
  });

  it("reads the persisted rating when one exists", () => {
    const deps = makeDeps();
    deps.ratingRepo.upsert({
      playerId: PLAYER_ID,
      rating: 1012,
      updatedAt: Date.now(),
    });
    expect(getPlayerProfile(PLAYER_ID, deps).rating).toBe(1012);
  });

  it("throws player_not_found for an unknown player", () => {
    const deps = makeDeps();
    expect(() => getPlayerProfile("nobody", deps)).toThrow(
      expect.objectContaining({ status: 404, code: "player_not_found" }),
    );
  });
});
