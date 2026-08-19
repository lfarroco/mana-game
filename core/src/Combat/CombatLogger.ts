/**
 * Combat Logger
 *
 * Pure data logger for combat simulation. Collects CombatLogEntry objects
 * during simulation with no side effects, callbacks, or visual logic.
 *
 * Design: entry types are defined without timeMs. The logger stamps timeMs
 * on each entry. CombatLogEntry = CombatLogInput & { timeMs: number }.
 */

import { WaveOutcome } from "../Models";
import { CurrentCombatStats, UnitCombatStats } from "./CombatStatsTracker";

// Cast entries — projectile launched, hit pending

export type DamageCastEntry = {
  type: "damage_cast";
  sourceId: string;
  targetId: string;
  amount: number;
  travelTime: number;
};

export type HealCastEntry = {
  type: "heal_cast";
  sourceId: string;
  targetId: string;
  amount: number;
  travelTime: number;
};

export type ShieldCastEntry = {
  type: "shield_cast";
  sourceId: string;
  targetId: string;
  amount: number;
  travelTime: number;
};

export type PoisonCastEntry = {
  type: "poison_cast";
  sourceId: string;
  targetId: string;
  amount: number;
  travelTime: number;
};

export type RegenCastEntry = {
  type: "regen_cast";
  sourceId: string;
  targetId: string;
  amount: number;
  travelTime: number;
};

export type HasteCastEntry = {
  type: "haste_cast";
  sourceId: string;
  targetId: string;
  effectDuration: number;
  travelTime: number;
};

export type SlowCastEntry = {
  type: "slow_cast";
  sourceId: string;
  targetId: string;
  effectDuration: number;
  travelTime: number;
};

export type SilenceCastEntry = {
  type: "silence_cast";
  sourceId: string;
  targetId: string;
  effectDuration: number;
  travelTime: number;
};

export type ChargeCastEntry = {
  type: "charge_cast";
  sourceId: string;
  targetId: string;
  amount: number;
  travelTime: number;
};

// Hit entries — projectile landed, effect applied

export type DamageHitEntry = {
  type: "damage_hit";
  sourceId: string;
  targetId: string;
  amount: number;
  newLife: number;
  lifeDelta: number;
  newShield: number;
  shieldDelta: number;
};

export type HealHitEntry = {
  type: "heal_hit";
  sourceId: string;
  targetId: string;
  amount: number;
  newLife: number;
  lifeDelta: number;
  newPoison: number;
};

export type ShieldHitEntry = {
  type: "shield_hit";
  sourceId: string;
  targetId: string;
  amount: number;
  newShield: number;
  shieldDelta: number;
};

export type PoisonHitEntry = {
  type: "poison_hit";
  sourceId: string;
  targetId: string;
  amount: number;
  newPoison: number;
  poisonDelta: number;
};

export type RegenHitEntry = {
  type: "regen_hit";
  sourceId: string;
  targetId: string;
  amount: number;
  newRegen: number;
  regenDelta: number;
};

export type HasteHitEntry = {
  type: "haste_hit";
  sourceId: string;
  targetId: string;
  effectDuration: number;
};

export type SlowHitEntry = {
  type: "slow_hit";
  sourceId: string;
  targetId: string;
  effectDuration: number;
};

export type SilenceHitEntry = {
  type: "silence_hit";
  sourceId: string;
  targetId: string;
  effectDuration: number;
};

export type ChargeHitEntry = {
  type: "charge_hit";
  sourceId: string;
  targetId: string;
  amount: number;
};

// Status end entries — haste/slow effect expires

export type HasteEndEntry = {
  type: "haste_end";
  unitId: string;
};

export type SlowEndEntry = {
  type: "slow_end";
  unitId: string;
};

export type SilenceEndEntry = {
  type: "silence_end";
  unitId: string;
};

/** D1: a silenced unit reached its turn and wasted it (no cast). */
export type SilenceSkipEntry = {
  type: "silence_skip";
  unitId: string;
};

// Immediate effect entries (no projectile)

export type IncreasePowerEntry = {
  type: "increase_power";
  sourceId?: string;
  targetId: string;
  amount: number;
  permanent: boolean;
};

export type DecreasePowerEntry = {
  type: "decrease_power";
  sourceId?: string;
  targetId: string;
  amount: number;
  permanent: boolean;
  affectedUnitId: string;
};

export type IncreaseCriticalEntry = {
  type: "increase_critical";
  sourceId?: string;
  targetId: string;
};

// Periodic tick entries (poison / regen over time)

export type PoisonTickEntry = {
  type: "poison_tick";
  force: string;
  amount: number;
  newLife: number;
  lifeDelta: number;
};

export type RegenTickEntry = {
  type: "regen_tick";
  force: string;
  amount: number;
  newLife: number;
  lifeDelta: number;
};

// Timeout / storm

export type TimeoutDamageCastEntry = {
  type: "timeout_damage_cast";
  force: string;
  damage: number;
  travelTime: number;
};

export type TimeoutDamageHitEntry = {
  type: "timeout_damage_hit";
  force: string;
  damage: number;
  newLife: number;
  newShield: number;
  lifeDelta: number;
  shieldDelta: number;
};

export type StormStartEntry = {
  type: "storm_start";
};

// Meta entries

export type CombatStatsEntry = {
  type: "combat_stats";
  unitStats: [string, UnitCombatStats][];
  currentCombatStats: [string, CurrentCombatStats][];
};

export type OutcomeEntry = {
  type: "outcome";
  result: WaveOutcome;
};

export type ReactionEntry = {
  type: "reaction";
  unitId: string;
};

export type CombatLogInput =
  | DamageCastEntry
  | HealCastEntry
  | ShieldCastEntry
  | PoisonCastEntry
  | RegenCastEntry
  | HasteCastEntry
  | SlowCastEntry
  | SilenceCastEntry
  | ChargeCastEntry
  | DamageHitEntry
  | HealHitEntry
  | ShieldHitEntry
  | PoisonHitEntry
  | RegenHitEntry
  | HasteHitEntry
  | SlowHitEntry
  | SilenceHitEntry
  | ChargeHitEntry
  | HasteEndEntry
  | SlowEndEntry
  | SilenceEndEntry
  | SilenceSkipEntry
  | IncreasePowerEntry
  | DecreasePowerEntry
  | IncreaseCriticalEntry
  | PoisonTickEntry
  | RegenTickEntry
  | TimeoutDamageCastEntry
  | TimeoutDamageHitEntry
  | StormStartEntry
  | CombatStatsEntry
  | OutcomeEntry
  | ReactionEntry;

// Output entry

export type CombatLogEntry = CombatLogInput & { timeMs: number };

export type CombatLogger = {
  log: (entry: CombatLogInput, timeMs?: number) => void;

  setCurrentTimeMs: (timeMs: number) => void;

  getCurrentTimeMs: () => number;

  getLogs: () => CombatLogEntry[];
};

export const createCombatLogger = (): CombatLogger => {
  let currentTimeMs = 0;
  const logs: CombatLogEntry[] = [];

  return {
    log: (entry: CombatLogInput, timeMs?: number) => {
      logs.push({
        ...entry,
        timeMs: timeMs ?? currentTimeMs,
      });
    },

    setCurrentTimeMs: (timeMs: number) => {
      currentTimeMs = timeMs;
    },

    getCurrentTimeMs: () => currentTimeMs,

    getLogs: () => logs,
  };
};
