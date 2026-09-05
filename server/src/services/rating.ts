/**
 * Rating service — thin server wrapper over the shared core rule.
 *
 * The wins-tier math lives in `@game/session/Rating` (shared with the
 * client, which previews the delta on the run-complete screen). This module
 * keeps the server's import surface (`services/rating`) and the default
 * rating stable so existing callers and tests don't churn.
 */

import {
  applyRatingDelta as coreApplyRatingDelta,
  getMultiplayerRatingDelta as coreGetMultiplayerRatingDelta,
  getMultiplayerVictoryTier as coreGetMultiplayerVictoryTier,
} from "@game/session/Rating";
import type { MultiplayerVictoryTier } from "../persistence/repositories";

// Re-exported so callers (sessionService, tests) keep importing the tier from
// rating.ts while the type lives in the persistence contract (repositories.ts).
export type { MultiplayerVictoryTier };

/** Default rating for a new player (initialized on first session creation). */
export const DEFAULT_PLAYER_RATING = 1000;

/**
 * The victory tier for a run's final win count, or null below the bronze
 * threshold. Wins are floored and clamped to >= 0.
 */
export function getMultiplayerVictoryTier(
  wins: number,
): MultiplayerVictoryTier | null {
  return coreGetMultiplayerVictoryTier(wins);
}

/** Rating delta for a run's final win count: gold 6, silver 4, bronze 2, 1. */
export function getMultiplayerRatingDelta(wins: number): number {
  return coreGetMultiplayerRatingDelta(wins);
}

/**
 * New rating after a completed run: the current rating plus the wins-based
 * delta. The current rating is floored and clamped to >= 0 (defensive — the
 * rating repo never stores negatives).
 */
export function applyRatingDelta(input: {
  currentRating: number;
  wins: number;
}): number {
  return coreApplyRatingDelta(input);
}
