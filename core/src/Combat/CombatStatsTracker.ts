import { CombatState, EffectId, SessionData, Unit } from "../Models";
import { FORCE_ID_PLAYER } from "../math/Constants";

export type UnitCombatStats = {
  unitId: string;
  unitName?: string;
  forceId: string;

  actionsPerformed: number;
  damageDealt: number;
  poisonApplied: number;
  healingDone: number;
  regenApplied: number;
  shieldGranted: number;
};

export type CurrentCombatStats = {
  damageDealt: number;
  poisonDealt: number;
  healDealt: number;
  regenDealt: number;
  shieldDealt: number;
};

export type CombatStatsTrackerState = {
  unitStats: Map<string, UnitCombatStats>;
  currentCombatStats: Map<string, CurrentCombatStats>;
};

function getForceStats(
  trackerState: CombatStatsTrackerState,
  forceId: string,
): CurrentCombatStats {
  if (!trackerState.currentCombatStats.has(forceId)) {
    trackerState.currentCombatStats.set(forceId, {
      damageDealt: 0,
      poisonDealt: 0,
      healDealt: 0,
      regenDealt: 0,
      shieldDealt: 0,
    });
  }
  return trackerState.currentCombatStats.get(forceId)!;
}

function makeUnitStats(unit: Unit): UnitCombatStats {
  return {
    unitId: unit.id,
    //unitName: getName(unit.cardId),
    forceId: unit.force,
    damageDealt: 0,
    poisonApplied: 0,
    healingDone: 0,
    regenApplied: 0,
    shieldGranted: 0,
    actionsPerformed: 0,
  };
}

/**
 * Returns the stats record for a unit, lazily registering it on first sight.
 * Units added mid-combat (e.g. future summon effects) are not present after
 * initialize() — registering them here keeps tracking crash-free and makes
 * their contributions count toward force stats (and threshold reactions).
 */
function getUnitStatsOrInit(
  trackerState: CombatStatsTrackerState,
  unit: Unit,
): UnitCombatStats {
  if (!trackerState.unitStats.has(unit.id)) {
    trackerState.unitStats.set(unit.id, makeUnitStats(unit));
  }
  return trackerState.unitStats.get(unit.id)!;
}

export function initialize(combatState: CombatState): CombatStatsTrackerState {
  const unitStats = new Map<string, UnitCombatStats>();
  const currentCombatStats = new Map<string, CurrentCombatStats>();

  for (const unit of combatState.units) {
    unitStats.set(unit.id, makeUnitStats(unit));
  }

  return { unitStats, currentCombatStats };
}

export function trackAction(
  trackerState: CombatStatsTrackerState,
  payload: { unit: Unit },
): void {
  const stats = getUnitStatsOrInit(trackerState, payload.unit);

  stats.actionsPerformed += 1;
}

const DAMAGE_THRESHOLD = 100;
const POISON_THRESHOLD = 10;
const HEAL_THRESHOLD = 100;
const REGEN_THRESHOLD = 10;
const SHIELD_THRESHOLD = 100;

type StatConfig = {
  unitStatKey: keyof UnitCombatStats;
  forceStatKey: keyof CurrentCombatStats;
  threshold?: number;
  reactionId?: EffectId;
};

const STAT_CONFIGS: Record<string, StatConfig> = {
  damage: {
    unitStatKey: "damageDealt",
    forceStatKey: "damageDealt",
    threshold: DAMAGE_THRESHOLD,
    reactionId: "every_100_damage",
  },
  poison: {
    unitStatKey: "poisonApplied",
    forceStatKey: "poisonDealt",
    threshold: POISON_THRESHOLD,
    reactionId: "every_10_poison",
  },
  heal: {
    unitStatKey: "healingDone",
    forceStatKey: "healDealt",
    threshold: HEAL_THRESHOLD,
    reactionId: "every_100_heal",
  },
  regen: {
    unitStatKey: "regenApplied",
    forceStatKey: "regenDealt",
    threshold: REGEN_THRESHOLD,
    reactionId: "every_10_regen",
  },
  shield: {
    unitStatKey: "shieldGranted",
    forceStatKey: "shieldDealt",
    threshold: SHIELD_THRESHOLD,
    reactionId: "every_100_shield",
  },
};

/** Tracks the last threshold level fired per force:stat combination.
 *  Key = "forceId:statKey" (e.g. "PLAYER:damage"), value = last threshold value fired. */
export type ThresholdState = Map<string, number>;

export function initializeThresholds(): ThresholdState {
  return new Map();
}

/**
 * Check all forces' accumulated stats against their thresholds.
 * Returns every crossed threshold as { forceId, reactionId } pairs.
 * Updates thresholdState in place so each level fires at most once.
 */
export function getCrossedThresholds(
  trackerState: CombatStatsTrackerState,
  thresholdState: ThresholdState,
): Array<{ forceId: string; reactionId: EffectId }> {
  const results: Array<{ forceId: string; reactionId: EffectId }> = [];

  for (const [statKey, config] of Object.entries(STAT_CONFIGS)) {
    if (!config.threshold || !config.reactionId) continue;

    for (const [forceId, forceStats] of trackerState.currentCombatStats) {
      const current = forceStats[config.forceStatKey] as number;
      if (current <= 0) continue;

      const key = `${forceId}:${statKey}`;
      const lastFired = thresholdState.get(key) ?? 0;
      let nextThreshold = lastFired + config.threshold;

      // May cross multiple thresholds at once (e.g. large burst damage)
      while (current >= nextThreshold) {
        results.push({ forceId, reactionId: config.reactionId });
        thresholdState.set(key, nextThreshold);
        nextThreshold += config.threshold;
      }
    }
  }

  return results;
}

/**
 * Accumulates a stat for the source unit and its force.
 *
 * NOTE: this function only accumulates — it never fires threshold reactions.
 * Threshold crossings (every_100_damage, every_10_poison, ...) are detected by
 * getCrossedThresholds(), which CombatRunner calls once per frame after all
 * stats for the frame have been tracked. The split exists so the tracker has
 * no dependency on the reaction/trigger pipeline.
 */
function trackStat(
  trackerState: CombatStatsTrackerState,
  amount: number,
  sourceUnit: Unit,
  configKey: keyof typeof STAT_CONFIGS,
) {
  if (amount <= 0) return;

  const config = STAT_CONFIGS[configKey];
  const stats = getUnitStatsOrInit(trackerState, sourceUnit);

  (stats[config.unitStatKey] as number) += amount;

  const forceStats = getForceStats(trackerState, stats.forceId);
  forceStats[config.forceStatKey] += amount;
}

export function trackDamage(
  trackerState: CombatStatsTrackerState,
  sourceUnit: Unit,
  damage: number,
): void {
  trackStat(trackerState, damage, sourceUnit, "damage");
}

export function trackPoison(
  trackerState: CombatStatsTrackerState,
  sourceUnit: Unit,
  poison: number,
): void {
  trackStat(trackerState, poison, sourceUnit, "poison");
}

export function trackHeal(
  trackerState: CombatStatsTrackerState,
  sourceUnit: Unit,
  healing: number,
): void {
  trackStat(trackerState, healing, sourceUnit, "heal");
}

export function trackRegen(
  trackerState: CombatStatsTrackerState,
  sourceUnit: Unit,
  regen: number,
): void {
  trackStat(trackerState, regen, sourceUnit, "regen");
}

export function trackShield(
  trackerState: CombatStatsTrackerState,
  sourceUnit: Unit,
  shield: number,
): void {
  trackStat(trackerState, shield, sourceUnit, "shield");
}

export function getUnitStats(
  trackerState: CombatStatsTrackerState,
  unitId: string,
): UnitCombatStats | undefined {
  return trackerState.unitStats.get(unitId);
}

export function stop(
  trackerState: CombatStatsTrackerState,
  session: SessionData,
): void {
  if (!session.runStats) {
    session.runStats = {
      damageDealt: 0,
      poisonDealt: 0,
      shieldDealt: 0,
      regenDealt: 0,
      healDealt: 0,
      mostPowerfulUnit: null,
      totalUnitsRecruited: 0,
      unitUsage: {},
    };
  }
  const { runStats } = session;

  const playerForceId = session.team.units[0]?.force || FORCE_ID_PLAYER;
  const playerStats = getForceStats(trackerState, playerForceId);

  runStats.damageDealt += playerStats.damageDealt;
  runStats.poisonDealt += playerStats.poisonDealt;
  runStats.healDealt += playerStats.healDealt;
  runStats.regenDealt += playerStats.regenDealt;
  runStats.shieldDealt += playerStats.shieldDealt;

  const player = { units: session.team.units };
  for (const unit of player.units) {
    if (
      !runStats.mostPowerfulUnit ||
      unit.power > runStats.mostPowerfulUnit.power
    ) {
      runStats.mostPowerfulUnit = { cardId: unit.cardId, power: unit.power };
    }
  }
}
