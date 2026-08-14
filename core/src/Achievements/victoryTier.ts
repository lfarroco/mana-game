import {
  BRONZE_VICTORY_THRESHOLD,
  GOLD_VICTORY_THRESHOLD,
  SILVER_VICTORY_THRESHOLD,
} from "../math/Constants";

export type VictoryTier = "bronze" | "silver" | "gold";

/** Determine the victory tier for a win count, or null below the bronze threshold. */
export function getVictoryTier(wins: number): VictoryTier | null {
  if (wins >= GOLD_VICTORY_THRESHOLD) return "gold";
  if (wins >= SILVER_VICTORY_THRESHOLD) return "silver";
  if (wins >= BRONZE_VICTORY_THRESHOLD) return "bronze";
  return null;
}
