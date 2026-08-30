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
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  NAME_CHANGE_COOLDOWN_MS,
  updateDisplayName,
  validateDisplayName,
} from "../src/services/playerService";
import { DEFAULT_PLAYER_RATING } from "../src/services/rating";
import { ApiError } from "../src/errors";

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

  it("reports rename availability: allowed for a never-changed player", () => {
    const deps = makeDeps();
    expect(getPlayerProfile(PLAYER_ID, deps).displayNameChange).toEqual({
      allowed: true,
    });
  });

  it("reports rename availability: blocked with nextAllowedAt within the cooldown", () => {
    const deps = makeDeps();
    const changedAt = Date.now() - 1000;
    deps.playerRepo.updateDisplayName(PLAYER_ID, "Fresh", changedAt);

    const change = getPlayerProfile(PLAYER_ID, deps).displayNameChange;
    expect(change.allowed).toBe(false);
    expect(change.nextAllowedAt).toBe(changedAt + NAME_CHANGE_COOLDOWN_MS);
  });

  it("reports rename availability: allowed again once the cooldown has passed", () => {
    const deps = makeDeps();
    deps.playerRepo.updateDisplayName(
      PLAYER_ID,
      "Old",
      Date.now() - NAME_CHANGE_COOLDOWN_MS - 1000,
    );

    expect(getPlayerProfile(PLAYER_ID, deps).displayNameChange).toEqual({
      allowed: true,
    });
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

describe("validateDisplayName", () => {
  it("returns the trimmed name", () => {
    expect(validateDisplayName("  Wizard  ")).toBe("Wizard");
  });

  it("rejects a name shorter than the minimum", () => {
    expect(() => validateDisplayName("a")).toThrow(
      expect.objectContaining({
        status: 400,
        code: "invalid_display_name",
        message: expect.stringContaining(`at least ${MIN_DISPLAY_NAME_LENGTH}`),
      }),
    );
    // Whitespace-only names trim to nothing → too short.
    expect(() => validateDisplayName("   ")).toThrow(
      expect.objectContaining({ code: "invalid_display_name" }),
    );
  });

  it("rejects a name longer than the maximum", () => {
    expect(() => validateDisplayName("x".repeat(MAX_DISPLAY_NAME_LENGTH + 1))).toThrow(
      expect.objectContaining({
        status: 400,
        code: "invalid_display_name",
        message: expect.stringContaining(`at most ${MAX_DISPLAY_NAME_LENGTH}`),
      }),
    );
  });

  it("rejects control characters", () => {
    expect(() => validateDisplayName("Bad\u0000Name")).toThrow(
      expect.objectContaining({ code: "invalid_display_name" }),
    );
    expect(() => validateDisplayName("Bad\u0007Name")).toThrow(
      expect.objectContaining({ code: "invalid_display_name" }),
    );
  });

  it("accepts names at the exact boundaries", () => {
    expect(validateDisplayName("ab".padStart(MIN_DISPLAY_NAME_LENGTH, "a"))).toBe(
      "ab".padStart(MIN_DISPLAY_NAME_LENGTH, "a"),
    );
    expect(validateDisplayName("x".repeat(MAX_DISPLAY_NAME_LENGTH))).toBe(
      "x".repeat(MAX_DISPLAY_NAME_LENGTH),
    );
  });
});

describe("updateDisplayName", () => {
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

  it("renames a player and returns the refreshed profile", () => {
    const deps = makeDeps();
    const profile = updateDisplayName(PLAYER_ID, "  NovaMage  ", deps);

    expect(profile.player.displayName).toBe("NovaMage");
    // The cooldown now applies.
    expect(profile.displayNameChange.allowed).toBe(false);
    expect(profile.displayNameChange.nextAllowedAt).toBeGreaterThan(Date.now());
    // Persisted to the repo.
    expect(deps.playerRepo.findById(PLAYER_ID)?.displayName).toBe("NovaMage");
    expect(deps.playerRepo.findById(PLAYER_ID)?.displayNameUpdatedAt).toBeDefined();
  });

  it("rejects a second change within the 30-day cooldown", () => {
    const deps = makeDeps();
    updateDisplayName(PLAYER_ID, "First", deps);

    expect(() => updateDisplayName(PLAYER_ID, "Second", deps)).toThrow(
      expect.objectContaining({
        status: 429,
        code: "name_change_cooldown",
        message: expect.stringContaining("change it again"),
      }),
    );
    // The original name is untouched.
    expect(deps.playerRepo.findById(PLAYER_ID)?.displayName).toBe("First");
  });

  it("allows a change once the cooldown has expired", () => {
    const deps = makeDeps();
    deps.playerRepo.updateDisplayName(
      PLAYER_ID,
      "Old",
      Date.now() - NAME_CHANGE_COOLDOWN_MS - 1000,
    );

    const profile = updateDisplayName(PLAYER_ID, "Fresh", deps);
    expect(profile.player.displayName).toBe("Fresh");
    expect(profile.displayNameChange.allowed).toBe(false);
  });

  it("validates the name before touching the player", () => {
    const deps = makeDeps();
    expect(() => updateDisplayName(PLAYER_ID, "", deps)).toThrow(
      expect.objectContaining({ code: "invalid_display_name" }),
    );
    expect(deps.playerRepo.findById(PLAYER_ID)?.displayName).toBe("Momo");
    expect(
      deps.playerRepo.findById(PLAYER_ID)?.displayNameUpdatedAt,
    ).toBeUndefined();
  });

  it("throws player_not_found for an unknown player", () => {
    const deps = makeDeps();
    expect(() => updateDisplayName("nobody", "Nova", deps)).toThrow(
      expect.objectContaining({ status: 404, code: "player_not_found" }),
    );
  });

  it("surfaces ApiError instances (not generic Errors)", () => {
    const deps = makeDeps();
    let caught: unknown = null;
    try {
      updateDisplayName(PLAYER_ID, "Bad\u0001Name", deps);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe("invalid_display_name");
  });
});
