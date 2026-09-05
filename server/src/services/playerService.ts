/**
 * Player profile service — assembles the multiplayer-lobby payload for
 * `GET /api/v1/players/me` (docs/multiplayer-lobby.md):
 *
 *   - identity (display name, provider) from the player repo,
 *   - the current rating,
 *   - career victory counts (all completed runs) and season victory counts
 *     (runs completed since the 1st of the current calendar month, UTC),
 *   - whether the player has a resumable (active, non-terminal) session,
 *   - rename availability (`displayNameChange`) for the 30-day cooldown.
 *
 * Also owns display-name changes (`PATCH /api/v1/players/me`): validation
 * (`validateDisplayName`) and the 30-day cooldown (`updateDisplayName`),
 * stamping `displayNameUpdatedAt` on the player. Players who never renamed
 * can always change it once — the first change is free.
 *
 * Pure assembly over the repos — no side effects, no direct persistence.
 */

import { ApiError } from "../errors";
import type { SessionData } from "@game/types/session";
import type {
  Player,
  PlayerRepo,
  PlayerStatsRepo,
  RatingRepo,
  SessionRepo,
  VictoryCounts,
} from "../persistence/repositories";
import { DEFAULT_PLAYER_RATING } from "./rating";

/** Zeroed victory counts (used when a player has no completions). */
export const EMPTY_VICTORY_COUNTS: VictoryCounts = {
  bronze: 0,
  silver: 0,
  gold: 0,
};

/** Display names may be changed at most once per this window (30 days). */
export const NAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/** Shortest accepted display name (after trimming). */
export const MIN_DISPLAY_NAME_LENGTH = 2;

/** Longest accepted display name (after trimming). */
export const MAX_DISPLAY_NAME_LENGTH = 24;

/** Control characters are never allowed in a display name. */
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

/**
 * Validate a display name and return it trimmed. Throws ApiError 400
 * `invalid_display_name` when the name is empty, too long, or contains
 * control characters.
 */
export function validateDisplayName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_DISPLAY_NAME_LENGTH) {
    throw new ApiError(
      400,
      "invalid_display_name",
      `Display name must be at least ${MIN_DISPLAY_NAME_LENGTH} characters long`,
    );
  }
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new ApiError(
      400,
      "invalid_display_name",
      `Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters long`,
    );
  }
  if (CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    throw new ApiError(
      400,
      "invalid_display_name",
      "Display name must not contain control characters",
    );
  }
  return trimmed;
}

/**
 * The season boundary: the first millisecond of the current calendar month in
 * UTC. "Season stats" = completions at or after this timestamp.
 */
export function getSeasonStartEpochMs(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export type PlayerProfile = {
  player: {
    playerId: string;
    displayName?: string;
    /** Provider-scoped identity (steam64 / itch username) — the name fallback. */
    providerId: string;
    provider: Player["provider"];
  };
  rating: number;
  /** Victory counts across all completed runs. */
  career: VictoryCounts;
  /** Victory counts since the 1st of the current month (UTC). */
  season: VictoryCounts;
  /** True when the player can resume an active run (matches GET /sessions/current). */
  hasActiveSession: boolean;
  /**
   * Rename availability — the player may change their display name at most
   * once per `NAME_CHANGE_COOLDOWN_MS`. `nextAllowedAt` (epoch ms) is present
   * exactly when `allowed` is false, so the client can show the countdown.
   */
  displayNameChange: {
    allowed: boolean;
    nextAllowedAt?: number;
  };
};

export type PlayerProfileDeps = {
  playerRepo: PlayerRepo;
  ratingRepo: RatingRepo;
  playerStatsRepo: PlayerStatsRepo;
  sessionRepo: SessionRepo;
};

/** One leaderboard row — rank is 1-based in leaderboard order. */
export type RankingEntry = {
  rank: number;
  playerId: string;
  /** Display name, falling back to the provider id (same rule as the lobby). */
  displayName: string;
  rating: number;
};

/** A page of the rating leaderboard (`GET /api/v1/players/ranking`). */
export type RankingPage = {
  entries: RankingEntry[];
  page: number;
  pageSize: number;
  /** Players in the ranking, including the viewer when they have no row yet. */
  totalPlayers: number;
  totalPages: number;
  /** The viewer's own 1-based rank (works before their first run, too). */
  yourRank: number;
  /** The viewer's effective rating (the default when they have no row yet). */
  yourRating: number;
};

export type RankingDeps = {
  playerRepo: PlayerRepo;
  ratingRepo: RatingRepo;
};

/**
 * A page of the rating leaderboard, ordered by rating DESC (playerId ASC
 * tiebreak). Entry names resolve through the player repo with the same
 * display-name-or-provider-id fallback the lobby profile uses. The viewer's
 * own rank is `1 + countAbove(...)` over their effective rating (the stored
 * rating, or the default when they have never played), so "Your ranking: #x"
 * is exact even before their first run.
 */
export async function getRankingPage(
  viewerPlayerId: string,
  page: number,
  pageSize: number,
  deps: RankingDeps,
): Promise<RankingPage> {
  const [stored, total, ratings] = await Promise.all([
    deps.ratingRepo.get(viewerPlayerId),
    deps.ratingRepo.count(),
    deps.ratingRepo.listTop(pageSize, (page - 1) * pageSize),
  ]);
  const yourRating = stored?.rating ?? DEFAULT_PLAYER_RATING;
  const above = await deps.ratingRepo.countAbove(yourRating, viewerPlayerId);

  const entries = await Promise.all(
    ratings.map(async (rating, index) => {
      const player = await deps.playerRepo.findById(rating.playerId);
      const displayName =
        player?.displayName && player.displayName.trim() !== ""
          ? player.displayName
          : (player?.providerId ?? rating.playerId);
      return {
        rank: (page - 1) * pageSize + index + 1,
        playerId: rating.playerId,
        displayName,
        rating: rating.rating,
      };
    }),
  );

  // The viewer counts toward the total even before their first run gives
  // them a rating row — otherwise their rank could exceed the total.
  const totalPlayers = stored ? total : total + 1;
  return {
    entries,
    page,
    pageSize,
    totalPlayers,
    totalPages: Math.max(1, Math.ceil(totalPlayers / pageSize)),
    yourRank: above + 1,
    yourRating,
  };
}

export async function getPlayerProfile(
  playerId: string,
  deps: PlayerProfileDeps,
): Promise<PlayerProfile> {
  const player = await deps.playerRepo.findById(playerId);
  if (!player) {
    throw new ApiError(
      404,
      "player_not_found",
      `No player with id '${playerId}'`,
    );
  }

  const now = Date.now();
  const [rating, career, season, session] = await Promise.all([
    deps.ratingRepo.get(playerId),
    deps.playerStatsRepo.getVictoryCounts(playerId, 0),
    deps.playerStatsRepo.getVictoryCounts(playerId, getSeasonStartEpochMs(now)),
    deps.sessionRepo.get(playerId),
  ]);

  return {
    player: {
      playerId: player.playerId,
      displayName: player.displayName,
      providerId: player.providerId,
      provider: player.provider,
    },
    rating: rating?.rating ?? DEFAULT_PLAYER_RATING,
    career,
    season,
    hasActiveSession: hasActiveSession(session),
    displayNameChange: getDisplayNameChange(player, now),
  };
}

/**
 * Change a player's display name, enforcing the 30-day cooldown
 * (`NAME_CHANGE_COOLDOWN_MS`). Returns the refreshed full profile (the same
 * shape as `getPlayerProfile`) so the client can re-render in one round trip.
 */
export async function updateDisplayName(
  playerId: string,
  displayName: string,
  deps: PlayerProfileDeps,
): Promise<PlayerProfile> {
  const player = await deps.playerRepo.findById(playerId);
  if (!player) {
    throw new ApiError(
      404,
      "player_not_found",
      `No player with id '${playerId}'`,
    );
  }

  const now = Date.now();
  const lastChange = player.displayNameUpdatedAt;
  if (lastChange !== undefined && now - lastChange < NAME_CHANGE_COOLDOWN_MS) {
    const nextAllowedAt = lastChange + NAME_CHANGE_COOLDOWN_MS;
    throw new ApiError(
      429,
      "name_change_cooldown",
      `Display name was changed recently — you can change it again on ${new Date(nextAllowedAt).toISOString()}`,
    );
  }

  const validated = validateDisplayName(displayName);
  const updated = await deps.playerRepo.updateDisplayName(
    playerId,
    validated,
    now,
  );
  if (!updated) {
    // The player vanished between findById and update (should not happen with
    // the single-process repos) — surface the same 404 as a missing player.
    throw new ApiError(
      404,
      "player_not_found",
      `No player with id '${playerId}'`,
    );
  }
  return getPlayerProfile(playerId, deps);
}

/** Rename availability derived from the last-change timestamp. */
function getDisplayNameChange(
  player: Player,
  now: number,
): PlayerProfile["displayNameChange"] {
  const lastChange = player.displayNameUpdatedAt;
  if (lastChange === undefined) {
    return { allowed: true };
  }
  const nextAllowedAt = lastChange + NAME_CHANGE_COOLDOWN_MS;
  if (now >= nextAllowedAt) {
    return { allowed: true };
  }
  return { allowed: false, nextAllowedAt };
}

/** A stored session is resumable unless the run already finished. */
function hasActiveSession(session: SessionData | null): boolean {
  if (!session) return false;
  return session.phase !== "victory" && session.phase !== "game_over";
}
