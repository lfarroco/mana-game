/**
 * Player profile service — assembles the multiplayer-lobby payload for
 * `GET /api/v1/players/me` (docs/multiplayer-lobby.md):
 *
 *   - identity (display name, provider) from the player repo,
 *   - the current rating,
 *   - career victory counts (all completed runs) and season victory counts
 *     (runs completed since the 1st of the current calendar month, UTC),
 *   - whether the player has a resumable (active, non-terminal) session.
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
};

export type PlayerProfileDeps = {
  playerRepo: PlayerRepo;
  ratingRepo: RatingRepo;
  playerStatsRepo: PlayerStatsRepo;
  sessionRepo: SessionRepo;
};

export function getPlayerProfile(
  playerId: string,
  deps: PlayerProfileDeps,
): PlayerProfile {
  const player = deps.playerRepo.findById(playerId);
  if (!player) {
    throw new ApiError(
      404,
      "player_not_found",
      `No player with id '${playerId}'`,
    );
  }

  const now = Date.now();

  return {
    player: {
      playerId: player.playerId,
      displayName: player.displayName,
      providerId: player.providerId,
      provider: player.provider,
    },
    rating: deps.ratingRepo.get(playerId)?.rating ?? DEFAULT_PLAYER_RATING,
    career: deps.playerStatsRepo.getVictoryCounts(playerId, 0),
    season: deps.playerStatsRepo.getVictoryCounts(
      playerId,
      getSeasonStartEpochMs(now),
    ),
    hasActiveSession: hasActiveSession(deps.sessionRepo.get(playerId)),
  };
}

/** A stored session is resumable unless the run already finished. */
function hasActiveSession(session: SessionData | null): boolean {
  if (!session) return false;
  return session.phase !== "victory" && session.phase !== "game_over";
}
