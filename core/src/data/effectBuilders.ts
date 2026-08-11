/**
 * Effect, reaction, and targeting builders.
 *
 * These are the same helpers used to author BaseCollection card data,
 * extracted into their own pure module so tests can build effect objects
 * with identical shapes — inline test objects drift from real effect shapes
 * (e.g. it's easy to forget that multiply_power requires baseMultiplier).
 *
 * Pure data, no Phaser deps — safe to import from any context.
 */

import * as Models from "../Models";

// ---------------------------------------------------------------------------
// Basic effects (parameterless)
// ---------------------------------------------------------------------------

export const regen: Models.Effect = { id: "regen" };
export const damage: Models.Effect = { id: "damage" };
export const heal: Models.Effect = { id: "heal" };
export const shield: Models.Effect = { id: "shield" };
export const poison: Models.Effect = { id: "poison" };

// ---------------------------------------------------------------------------
// Parameterized effects
// ---------------------------------------------------------------------------

export const haste = (
  duration: number,
  targets: Models.Targeting,
): Models.Effect => ({ id: "haste", duration, targets });
export const slow = (
  duration: number,
  targets: Models.Targeting,
): Models.Effect => ({ id: "slow", duration, targets });
export const charge = (
  duration: number,
  targets: Models.Targeting,
): Models.Effect => ({ id: "charge", duration, targets });
export const increasePower = (
  amount: number,
  targets: Models.Targeting,
  permanent: boolean = false,
): Models.Effect => ({ id: "increase_power", amount, permanent, targets });
export const decreasePower = (
  amount: number,
  targets: Models.Targeting,
  permanent: boolean = false,
): Models.Effect => ({ id: "decrease_power", amount, permanent, targets });
export const increaseCritical = (
  amount: number,
  targets: Models.Targeting,
): Models.Effect => ({ id: "increase_critical", amount, targets });
export const multiplyPower = (
  multiplier: number,
  targets: Models.Targeting,
): Models.Effect => ({
  id: "multiply_power",
  multiplier,
  baseMultiplier: multiplier,
  targets,
});
export const distributePower = (targets: Models.Targeting): Models.Effect => ({
  id: "distribute_power",
  targets,
});
export const absorbPower = (targets: Models.Targeting): Models.Effect => ({
  id: "absorb_power",
  targets,
});

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export const reaction = (
  effect: Models.EffectId | "all",
  position: Models.EffectSourcePosition,
  reactWith: Models.Effect,
  triggerTeam?: "own" | "enemy",
): Models.EffectReaction => ({
  position,
  effectId: effect,
  effects: [reactWith],
  ...(triggerTeam ? { triggerTeam } : {}),
});

// ---------------------------------------------------------------------------
// Targeting
// ---------------------------------------------------------------------------

export const column: Models.Targeting = { id: "column_allies" };
export const row: Models.Targeting = { id: "row_allies" };
export const randomAlly = (count: number): Models.Targeting => ({
  id: "random_ally",
  count,
});
export const randomEnemy = (count: number): Models.Targeting => ({
  id: "random_enemy",
  count,
});
export const trigger: Models.Targeting = { id: "trigger" };
export const self: Models.Targeting = { id: "self" };
export const left: Models.Targeting = { id: "left_ally" };
export const right: Models.Targeting = { id: "right_ally" };
export const top: Models.Targeting = { id: "top_ally" };
export const bottom: Models.Targeting = { id: "bottom_ally" };
export const weakestAlly: Models.Targeting = { id: "weakest_ally" };
export const strongestEnemy: Models.Targeting = { id: "strongest_enemy" };
export const strongestAlly: Models.Targeting = { id: "strongest_ally" };
export const weakestEnemy: Models.Targeting = { id: "weakest_enemy" };
export const allAllies: Models.Targeting = { id: "all_allies", ofType: "any" };
export const allAlliesOfType = (
  ofType: "damage" | "heal" | "shield" | "poison" | "regen",
): Models.Targeting => ({ id: "all_allies", ofType });
