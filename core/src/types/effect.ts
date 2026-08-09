/**
 * Effect, EffectReaction, EffectSourcePosition, and EffectId types.
 *
 * Effect is a discriminated union of all possible action types a unit can perform.
 * EffectReaction describes a trigger (when a specific effect is performed by a
 * unit at a given position, fire these effects).
 */

import type { Targeting } from "./targeting";

/**
 * Where the triggering unit must be relative to the reacting unit for a
 * reaction to fire (see processReactions in TriggerSystem).
 *
 * Note on "self": processReactions excludes the triggering unit from
 * candidates for all non-global effects (prevents infinite loops), so
 * `position: "self"` can only ever fire for global reaction IDs
 * (Models.GLOBAL_REACTIONS — on_crit, every_100_damage, on_battle_start, ...).
 * Card registration warns about self + non-global combinations
 * (see validateCardDefinition in Entities/Card).
 */
export type EffectSourcePosition =
  | "all"
  | "allies"
  | "enemies"
  | "row_allies"
  | "column_allies"
  | "top_ally"
  | "bottom_ally"
  | "left_ally"
  | "right_ally"
  | "self";

export type EffectId =
  | "damage"
  | "heal"
  | "shield"
  | "poison"
  | "regen"
  | "haste"
  | "slow"
  | "charge"
  | "increase_power"
  | "decrease_power"
  | "multiply_power"
  | "increase_critical"
  | "distribute_power"
  | "absorb_power"
  | "sacrifice_effect"
  | "re_hasted"
  | "re_slow"
  | "on_crit"
  | "on_battle_start"
  | "on_over_heal"
  | "every_100_damage"
  | "every_10_poison"
  | "every_100_heal"
  | "every_10_regen"
  | "every_100_shield";

export type Effect =
  | { id: "damage" }
  | { id: "heal" }
  | { id: "shield" }
  | { id: "poison" }
  | { id: "regen" }
  | { id: "haste"; duration: number; targets: Targeting }
  | { id: "slow"; duration: number; targets: Targeting }
  | { id: "charge"; duration: number; targets: Targeting }
  | {
      id: "increase_power";
      amount: number;
      permanent?: boolean;
      targets: Targeting;
    }
  | {
      id: "decrease_power";
      amount: number;
      permanent?: boolean;
      targets: Targeting;
    }
  | {
      id: "multiply_power";
      multiplier: number;
      baseMultiplier: number;
      targets: Targeting;
    }
  | {
      id: "increase_critical";
      amount: number;
      permanent?: boolean;
      targets: Targeting;
    }
  | { id: "distribute_power"; targets: Targeting; permanent?: boolean }
  | { id: "absorb_power"; targets: Targeting; permanent?: boolean }
  | { id: "sacrifice_effect"; targets: Targeting }
  | { id: "re_hasted" }
  | { id: "re_slow" }
  | { id: "on_crit" }
  | { id: "on_battle_start" }
  | { id: "on_over_heal" }
  | { id: "every_100_damage" }
  | { id: "every_10_poison" }
  | { id: "every_100_heal" }
  | { id: "every_10_regen" }
  | { id: "every_100_shield" };

export type EffectReaction = {
  position: EffectSourcePosition;
  effectId: EffectId | "all";
  effects: Effect[];
  /** Whose accumulated stats trigger this reaction?
   *  "own" (default) = reactor's own team. "enemy" = opposing team.
   *  Only meaningful for threshold reactions (every_100_damage, etc.). */
  triggerTeam?: "own" | "enemy";
};
