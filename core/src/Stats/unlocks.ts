import type { VictoryTier } from "../Achievements/victoryTier";
import {
  INFINITE_ROUND_UNLOCK_THRESHOLD,
  TOTAL_OUTPUT_UNLOCK_THRESHOLD,
  TOTAL_DOT_UNLOCK_THRESHOLD,
} from "../math/Constants";
import type { PlayerStats } from "./stats";

/** Wins at exactly the given tier for a core (0 when the core has no entry). */
function getWins(s: PlayerStats, coreId: string, tier: VictoryTier): number {
  return s.coreUnitWins[coreId]?.[tier] || 0;
}

/** Wins at or above the given tier for a core ("bronze" = bronze+silver+gold). */
function getWinsOrBetter(
  s: PlayerStats,
  coreId: string,
  tier: VictoryTier,
): number {
  const wins = s.coreUnitWins[coreId];
  if (!wins) return 0;
  if (tier === "gold") return wins.gold;
  if (tier === "silver") return wins.silver + wins.gold;
  return wins.bronze + wins.silver + wins.gold;
}

/** Total wins at or above the given tier across every core. */
function getTotalWinsOrBetter(s: PlayerStats, tier: VictoryTier): number {
  let total = 0;
  for (const coreId in s.coreUnitWins) {
    const wins = s.coreUnitWins[coreId];
    if (tier === "gold") total += wins.gold;
    else if (tier === "silver") total += wins.silver + wins.gold;
    else total += wins.bronze + wins.silver + wins.gold;
  }
  return total;
}

/**
 * Evaluate all unit-unlock rules, returning the ids that newly qualify — not
 * already in unlockedUnits and not already in pendingUnlockUnits — in rule
 * order. When unlock checks are disabled, returns [].
 */
export function evaluateUnlocks(
  s: PlayerStats,
  enableUnlocks: boolean,
): string[] {
  if (!enableUnlocks) return [];

  const result: string[] = [];
  const queue = (unitId: string): void => {
    if (
      !result.includes(unitId) &&
      !s.unlockedUnits.includes(unitId) &&
      !s.pendingUnlockUnits.includes(unitId)
    ) {
      result.push(unitId);
    }
  };

  if (s.furthestInfiniteRound >= INFINITE_ROUND_UNLOCK_THRESHOLD)
    queue("walking_reactor");

  if (getWins(s, "mana_crystal", "gold") >= 1) queue("spectral_knight");

  if (getWins(s, "quickstone", "gold") >= 1) queue("windlash_serpent");

  if (getWins(s, "purple_crystal", "gold") >= 1) queue("corruption_bringer");

  if (getWins(s, "critical_crystal", "gold") >= 1) queue("frontline_dasher");

  if (getWins(s, "growth_crystal", "gold") >= 1) queue("life_balancekeeper");

  if (getWins(s, "protective_crystal", "gold") >= 1) queue("destiny_balancer");

  if (getTotalWinsOrBetter(s, "bronze") >= 1) queue("cadence_warden");

  if (getWinsOrBetter(s, "mana_crystal", "bronze") >= 3)
    queue("essence_harvester");

  if (getWinsOrBetter(s, "purple_crystal", "bronze") >= 3)
    queue("plague_incubator");

  if (getWinsOrBetter(s, "protective_crystal", "bronze") >= 3)
    queue("tempest_ravager");

  if (getTotalWinsOrBetter(s, "bronze") >= 5) queue("paragon");

  if (getWinsOrBetter(s, "growth_crystal", "bronze") >= 3)
    queue("vitality_channeler");

  if (s.totalHealed >= TOTAL_OUTPUT_UNLOCK_THRESHOLD) queue("mend_sage");

  if (s.totalDamage >= TOTAL_OUTPUT_UNLOCK_THRESHOLD) queue("warbringer");

  if (s.totalShield >= TOTAL_OUTPUT_UNLOCK_THRESHOLD) queue("aegis_archon");

  if (s.totalPoison >= TOTAL_DOT_UNLOCK_THRESHOLD) queue("plague_sovereign");

  if (s.totalRegen >= TOTAL_DOT_UNLOCK_THRESHOLD) queue("life_weaver");

  if (getWinsOrBetter(s, "critical_crystal", "bronze") >= 3)
    queue("fate_shifter");

  return result;
}
