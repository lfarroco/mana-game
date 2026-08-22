import { getVictoryTier, type VictoryTier } from "./victoryTier";

/** Crystals eligible for Steam victory achievements. */
export type CrystalType =
  | "mana_crystal"
  | "critical_crystal"
  | "protective_crystal"
  | "growth_crystal"
  | "purple_crystal"
  | "quickstone";

export const VICTORY_ELIGIBLE_CRYSTALS: CrystalType[] = [
  "mana_crystal",
  "critical_crystal",
  "protective_crystal",
  "growth_crystal",
  "purple_crystal",
  "quickstone",
];

/** Steam achievement id for a crystal + tier (e.g. GOLD_MANA_CRYSTAL). */
export function getAchievementId(
  crystal: CrystalType,
  tier: VictoryTier,
): string {
  return `${tier.toUpperCase()}_${crystal.toUpperCase()}`;
}

export type AchievementConfig = {
  enableAchievements: boolean;
};

/**
 * Victory-achievement ids to unlock for a win count + core crystal, in
 * cascade order (bronze first, then silver, then gold for higher wins).
 * Returns [] when achievements are disabled, the win count is below the
 * bronze tier, or the core is not achievement-eligible.
 */
export function getAchievementUnlocks(
  wins: number,
  coreCardId: string,
  config: AchievementConfig,
): string[] {
  if (!config.enableAchievements) return [];
  const tier = getVictoryTier(wins);
  if (!tier) return [];
  const crystal = coreCardId as CrystalType;
  if (!VICTORY_ELIGIBLE_CRYSTALS.includes(crystal)) return [];

  const tiersToUnlock: VictoryTier[] = ["bronze"];
  if (tier === "silver" || tier === "gold") tiersToUnlock.push("silver");
  if (tier === "gold") tiersToUnlock.push("gold");
  return tiersToUnlock.map((t) => getAchievementId(crystal, t));
}
