/**
 * Multiplayer rating — wins-based rating deltas on run completion.
 *
 * Pure functions, no persistence: the delta is a flat wins-tier bonus
 * (gold 6, silver 4, bronze 2, otherwise 1) based on the run's final win
 * count (thresholds 10/8/5). Shared by the server (applies the delta on
 * terminal `end_combat`) and the client (previews the change on the
 * run-complete screen), so the rule lives here instead of being duplicated.
 */

/** Victory tier for a run's final win count (null below bronze). */
export type MultiplayerVictoryTier = "bronze" | "silver" | "gold";

/** Default rating for a new player (initialized on first session creation). */
export const DEFAULT_PLAYER_RATING = 1000;

const BRONZE_VICTORY_WINS = 5;
const SILVER_VICTORY_WINS = 8;
const GOLD_VICTORY_WINS = 10;

/**
 * The victory tier for a run's final win count, or null below the bronze
 * threshold. Wins are floored and clamped to >= 0.
 */
export function getMultiplayerVictoryTier(
  wins: number,
): MultiplayerVictoryTier | null {
  const normalizedWins = Math.max(0, Math.floor(Number(wins) || 0));

  if (normalizedWins >= GOLD_VICTORY_WINS) {
    return "gold";
  }
  if (normalizedWins >= SILVER_VICTORY_WINS) {
    return "silver";
  }
  if (normalizedWins >= BRONZE_VICTORY_WINS) {
    return "bronze";
  }

  return null;
}

/** Rating delta for a run's final win count: gold 6, silver 4, bronze 2, 1. */
export function getMultiplayerRatingDelta(wins: number): number {
  const victoryTier = getMultiplayerVictoryTier(wins);

  switch (victoryTier) {
    case "gold":
      return 6;
    case "silver":
      return 4;
    case "bronze":
      return 2;
    default:
      return 1;
  }
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
  const current = Math.max(0, Math.floor(Number(input.currentRating) || 0));
  return current + getMultiplayerRatingDelta(input.wins);
}
