/**
 * Pure orb definitions — data registry (no factories, no RNG).
 *
 * Each orb is a plain data object. For reaction orbs, `possibleEffects` lists
 * all options; the caller picks one using a seeded RNG at apply time.
 */

import { Effect, EffectId } from "../Models";
import * as OrbConstants from "./OrbConstants";

// ---------------------------------------------------------------------------
// Pure Effect objects used as possible effects inside reaction orbs
// ---------------------------------------------------------------------------

export function increasePowerOnTypeEffect(
  type: "damage" | "heal" | "shield" | "poison" | "regen",
): Effect {
  return {
    id: "increase_power",
    amount: 2,
    targets: { id: "all_allies", ofType: type },
  };
}

export const increaseCriticalEffect: Effect = {
  id: "increase_critical",
  amount: OrbConstants.CRITICAL_INCREASE,
  targets: { id: "random_ally", count: 1 },
};

export const increasePowerOnWeakest: Effect = {
  id: "increase_power",
  amount: OrbConstants.WEAKEST_POWER_INCREASE,
  targets: { id: "weakest_ally" },
};

export const decreaseRandomEnemyPowerEffect: Effect = {
  id: "decrease_power",
  amount: OrbConstants.ENEMY_POWER_DECREASE,
  targets: { id: "random_enemy", count: 1 },
};

export const decreaseStrongestEnemyPowerEffect: Effect = {
  id: "decrease_power",
  amount: OrbConstants.ENEMY_POWER_DECREASE,
  targets: { id: "random_enemy", count: 1 },
};

export const hasteEffect: Effect = {
  id: "haste",
  duration: OrbConstants.HASTE_DURATION_MS,
  targets: { id: "random_ally", count: 2 },
};

export const slowEffect: Effect = {
  id: "slow",
  duration: OrbConstants.SLOW_DURATION_MS,
  targets: { id: "random_enemy", count: 2 },
};

export const chargeEffect: Effect = {
  id: "charge",
  duration: OrbConstants.CHARGE_DURATION_MS,
  targets: { id: "random_ally", count: 2 },
};

// ---------------------------------------------------------------------------
// Orb definition type & data registry
// ---------------------------------------------------------------------------

export type OrbDefinition =
  | {
      id: string;
      kind: "stat";
      stat: "increase_power" | "decrease_cooldown" | "increase_critical";
      effectType: string;
    }
  | {
      id: string;
      kind: "special";
      special:
        | "upgrade"
        | "distribute_power"
        | "absorb_power"
        | "sacrifice"
        | "sacrifice_unit"
        | "scrap_salvage";
    }
  | {
      id: string;
      kind: "reaction";
      effectId: EffectId;
      position: "allies";
      possibleEffects: Effect[];
    };

export const ORB_DEFINITIONS: Record<string, OrbDefinition> = {};

// ---------------------------------------------------------------------------
// Register all orb definitions
// ---------------------------------------------------------------------------

const statTypes = [
  "damage",
  "heal",
  "shield",
  "poison",
  "regen",
  "haste",
  "slow",
  "charge",
] as const;
const statCategories = [
  "increase_power",
  "decrease_cooldown",
  "increase_critical",
] as const;

for (const cat of statCategories) {
  for (const t of statTypes) {
    const id = `${cat}_on_${t}`;
    ORB_DEFINITIONS[id] = { id, kind: "stat", stat: cat, effectType: t };
  }
}

const specials: OrbDefinition[] = [
  { id: "upgrade_orb", kind: "special", special: "upgrade" },
  { id: "distribute_power_orb", kind: "special", special: "distribute_power" },
  { id: "absorb_power_orb", kind: "special", special: "absorb_power" },
  { id: "sacrifice_effect_orb", kind: "special", special: "sacrifice" },
  { id: "sacrifice_unit_orb", kind: "special", special: "sacrifice_unit" },
  { id: "scrap_salvage_orb", kind: "special", special: "scrap_salvage" },
];
for (const def of specials) ORB_DEFINITIONS[def.id] = def;

const reactions: OrbDefinition[] = [
  {
    id: "on_100_damage_effect",
    kind: "reaction",
    effectId: "every_100_damage",
    position: "allies",
    possibleEffects: [
      increasePowerOnTypeEffect("heal"),
      increasePowerOnTypeEffect("shield"),
      increasePowerOnTypeEffect("poison"),
      increasePowerOnTypeEffect("regen"),
    ],
  },
  {
    id: "on_100_shield_effect",
    kind: "reaction",
    effectId: "every_100_shield",
    position: "allies",
    possibleEffects: [
      increasePowerOnTypeEffect("heal"),
      increasePowerOnTypeEffect("damage"),
      increasePowerOnTypeEffect("poison"),
      increasePowerOnTypeEffect("regen"),
    ],
  },
  {
    id: "on_100_heal_effect",
    kind: "reaction",
    effectId: "every_100_heal",
    position: "allies",
    possibleEffects: [
      increasePowerOnWeakest,
      increasePowerOnTypeEffect("shield"),
      increasePowerOnTypeEffect("damage"),
      increasePowerOnTypeEffect("poison"),
      increasePowerOnTypeEffect("regen"),
    ],
  },
  {
    id: "on_10_regen_effect",
    kind: "reaction",
    effectId: "every_10_regen",
    position: "allies",
    possibleEffects: [
      increasePowerOnTypeEffect("shield"),
      increasePowerOnTypeEffect("damage"),
      increasePowerOnTypeEffect("poison"),
      increasePowerOnTypeEffect("heal"),
    ],
  },
  {
    id: "on_10_poison_effect",
    kind: "reaction",
    effectId: "every_10_poison",
    position: "allies",
    possibleEffects: [
      increasePowerOnTypeEffect("shield"),
      increasePowerOnTypeEffect("damage"),
      increasePowerOnTypeEffect("regen"),
      increasePowerOnTypeEffect("heal"),
    ],
  },
  {
    id: "on_re_slow_effect",
    kind: "reaction",
    effectId: "re_slow",
    position: "allies",
    possibleEffects: [
      decreaseRandomEnemyPowerEffect,
      decreaseStrongestEnemyPowerEffect,
      increasePowerOnTypeEffect("poison"),
      increasePowerOnTypeEffect("shield"),
    ],
  },
  {
    id: "on_re_haste_effect",
    kind: "reaction",
    effectId: "re_hasted",
    position: "allies",
    possibleEffects: [
      increaseCriticalEffect,
      increasePowerOnTypeEffect("damage"),
      increasePowerOnTypeEffect("shield"),
      increasePowerOnTypeEffect("heal"),
    ],
  },
  {
    id: "on_over_heal_effect",
    kind: "reaction",
    effectId: "on_over_heal",
    position: "allies",
    possibleEffects: [
      increaseCriticalEffect,
      hasteEffect,
      increasePowerOnWeakest,
    ],
  },
  {
    id: "on_crit_effect",
    kind: "reaction",
    effectId: "on_crit",
    position: "allies",
    possibleEffects: [
      decreaseRandomEnemyPowerEffect,
      decreaseStrongestEnemyPowerEffect,
      increasePowerOnTypeEffect("damage"),
      increasePowerOnTypeEffect("shield"),
      increasePowerOnTypeEffect("heal"),
    ],
  },
  {
    id: "on_battle_start_effect",
    kind: "reaction",
    effectId: "on_battle_start",
    position: "allies",
    possibleEffects: [hasteEffect, slowEffect, chargeEffect],
  },
];
for (const def of reactions) ORB_DEFINITIONS[def.id] = def;

// ---------------------------------------------------------------------------
// Surprise-orb pool for chaos encounters (A10 Chaos Altar, A11 Roulette Wheel)
// ---------------------------------------------------------------------------

/**
 * The "random orb" pool for chaos-style encounters.
 *
 * Every id here is dispatched by `OrbAndCoreUpgrades.applyOrb`: stat orbs
 * no-op silently on a mismatched unit (the chaos), special orbs
 * redistribute/rank up/sacrifice an effect, and reaction orbs append a
 * reaction. The core-upgrade stat ids (`increase_core_max_life` /
 * `upgrade_core_power` / `decrease_core_cooldown`) are not orbs — they are
 * `StaticOptionId`s applied via the core-upgrade flow (CUB-B3,
 * `applyCoreUpgrade`), so they never enter this pool.
 *
 * Order is the deterministic registration order (stat orbs, specials,
 * reactions) — seeding is all we need for reproducible picks.
 */
export const RANDOM_ORB_POOL: string[] = Object.keys(ORB_DEFINITIONS);
