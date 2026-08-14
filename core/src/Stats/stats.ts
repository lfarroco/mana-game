import type { VictoryTier } from "../Achievements/victoryTier";
import type { RunStats } from "../types/session";

export type { VictoryTier };

export type PlayerStats = {
  totalRuns: number;
  bronzeVictories: number;
  silverVictories: number;
  goldVictories: number;
  furthestInfiniteRound: number;
  unitUsage: Record<string, number>;
  coreUnitWins: Record<
    string,
    { bronze: number; silver: number; gold: number }
  >;
  totalHealed: number;
  totalDamage: number;
  totalShield: number;
  totalPoison: number;
  totalRegen: number;
  mostPowerfulUnit: { name: string; power: number } | null;
  unlockedUnits: string[];
  pendingUnlockUnits: string[];
};

export const STATS_STORAGE_KEY = "mana-game-player-stats-v1";

export const createDefaultStats = (): PlayerStats => ({
  totalRuns: 0,
  bronzeVictories: 0,
  silverVictories: 0,
  goldVictories: 0,
  furthestInfiniteRound: 0,
  unitUsage: {},
  coreUnitWins: {},
  totalHealed: 0,
  totalDamage: 0,
  totalShield: 0,
  totalPoison: 0,
  totalRegen: 0,
  mostPowerfulUnit: null,
  unlockedUnits: [],
  pendingUnlockUnits: [],
});

/**
 * Parse persisted player stats with the same per-field validation as the
 * original StatsStore. Returns null for empty/raw-unparseable/non-object
 * payloads; otherwise a validated PlayerStats with invalid fields falling
 * back to their defaults.
 */
export function parseStats(raw: string | null): PlayerStats | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const data = parsed as Record<string, unknown>;
  return {
    totalRuns: typeof data.totalRuns === "number" ? data.totalRuns : 0,
    bronzeVictories:
      typeof data.bronzeVictories === "number" ? data.bronzeVictories : 0,
    silverVictories:
      typeof data.silverVictories === "number" ? data.silverVictories : 0,
    goldVictories:
      typeof data.goldVictories === "number" ? data.goldVictories : 0,
    furthestInfiniteRound:
      typeof data.furthestInfiniteRound === "number"
        ? data.furthestInfiniteRound
        : 0,
    unitUsage:
      typeof data.unitUsage === "object" && data.unitUsage !== null
        ? (data.unitUsage as Record<string, number>)
        : {},
    coreUnitWins:
      typeof data.coreUnitWins === "object" && data.coreUnitWins !== null
        ? (data.coreUnitWins as Record<
            string,
            { bronze: number; silver: number; gold: number }
          >)
        : {},
    totalHealed: typeof data.totalHealed === "number" ? data.totalHealed : 0,
    totalDamage: typeof data.totalDamage === "number" ? data.totalDamage : 0,
    totalShield: typeof data.totalShield === "number" ? data.totalShield : 0,
    totalPoison: typeof data.totalPoison === "number" ? data.totalPoison : 0,
    totalRegen: typeof data.totalRegen === "number" ? data.totalRegen : 0,
    mostPowerfulUnit:
      data.mostPowerfulUnit &&
      typeof (data.mostPowerfulUnit as { name?: unknown }).name === "string"
        ? (data.mostPowerfulUnit as { name: string; power: number })
        : null,
    unlockedUnits: Array.isArray(data.unlockedUnits)
      ? (data.unlockedUnits as string[])
      : [],
    pendingUnlockUnits: Array.isArray(data.pendingUnlockUnits)
      ? (data.pendingUnlockUnits as string[])
      : [],
  };
}

/** Add one to totalRuns. Returns a new object; never mutates the input. */
export function incrementRuns(s: PlayerStats): PlayerStats {
  return { ...s, totalRuns: s.totalRuns + 1 };
}

/** Record a tiered victory, incrementing the matching tier counter and (when a core unit is given) the per-core tier win count. */
export function recordVictory(
  s: PlayerStats,
  tier: VictoryTier,
  coreUnitId?: string,
): PlayerStats {
  const next: PlayerStats = { ...s };
  switch (tier) {
    case "gold":
      next.goldVictories += 1;
      break;
    case "silver":
      next.silverVictories += 1;
      break;
    case "bronze":
      next.bronzeVictories += 1;
      break;
  }
  if (coreUnitId) {
    const existing = next.coreUnitWins[coreUnitId];
    const updated =
      existing === undefined
        ? { bronze: 0, silver: 0, gold: 0, [tier]: 1 }
        : { ...existing, [tier]: existing[tier] + 1 };
    next.coreUnitWins = { ...next.coreUnitWins, [coreUnitId]: updated };
  }
  return next;
}

/** Accumulate a completed run's damage/heal/shield/poison/regen totals. */
export function recordRun(s: PlayerStats, runStats: RunStats): PlayerStats {
  return {
    ...s,
    totalDamage: s.totalDamage + runStats.damageDealt,
    totalShield: s.totalShield + runStats.shieldDealt,
    totalPoison: s.totalPoison + runStats.poisonDealt,
    totalRegen: s.totalRegen + runStats.regenDealt,
    totalHealed: s.totalHealed + runStats.healDealt,
  };
}

/** Track the furthest infinite round reached; only ever moves upward. */
export function updateFurthestInfiniteRound(
  s: PlayerStats,
  wins: number,
): PlayerStats {
  if (wins > s.furthestInfiniteRound) {
    return { ...s, furthestInfiniteRound: wins };
  }
  return s;
}

/** Record one use of a unit by name. */
export function recordUnitUsage(s: PlayerStats, name: string): PlayerStats {
  return {
    ...s,
    unitUsage: { ...s.unitUsage, [name]: (s.unitUsage[name] || 0) + 1 },
  };
}

/** Track the most powerful unit seen, flooring power; only replaced by strictly higher power. */
export function checkMostPowerfulUnit(
  s: PlayerStats,
  name: string,
  power: number,
): PlayerStats {
  if (!s.mostPowerfulUnit || power > s.mostPowerfulUnit.power) {
    return { ...s, mostPowerfulUnit: { name, power: Math.floor(power) } };
  }
  return s;
}

/** Name of the most-used unit, or null when no usage has been recorded. */
export function getMostUsedUnit(s: PlayerStats): string | null {
  const entries = Object.entries(s.unitUsage);
  if (entries.length === 0) return null;

  let maxName = entries[0][0];
  let maxCount = entries[0][1];

  for (const [name, count] of entries) {
    if (count > maxCount) {
      maxName = name;
      maxCount = count;
    }
  }

  return maxName;
}
