/**
 * Shared Actual Power (AP) pricing model.
 *
 * Implements the AP model from docs/unit-balance.md §§6–13. Used by both
 * balance gates — the static card gate (BaseCollection.balance.test.ts) and the
 * core-upgrade-orb gate (content/coreUpgrades.balance.test.ts) — so every card
 * and orb is priced against exactly the same formulas.
 *
 * AP per 5s = Σ(action value) × (5 / cooldown_s) + Σ(reaction value). See the
 * balance doc for the derivation of each effect/reaction term.
 */

import { CardDefinition } from "../Models";

export type EffectLike = {
  id: string;
  amount?: number;
  permanent?: boolean;
  duration?: number;
  multiplier?: number;
  targets?: { id: string; ofType?: string };
};

export type ReactionLike = {
  effectId: string;
  position: string;
  effects: EffectLike[];
};

/** Targeting multiplier §10 — √(number of possible targets), single = 1. */
export function targetMultiplier(targetsId: string): number {
  switch (targetsId) {
    case "row_allies":
    case "column_allies":
      return Math.sqrt(3);
    case "all_allies":
      return Math.sqrt(8);
    case "all_enemies":
      return 3;
    default:
      return 1;
  }
}

/** Conditional discount §11 — effects restricted to a type cost 30% less. */
export function conditionalDiscount(effect: EffectLike): number {
  const ofType = effect.targets?.ofType;
  return ofType && ofType !== "any" ? 0.7 : 1;
}

/** Base trigger frequency per source per 5s §7.1. */
export function baseFrequency(effectId: string): number {
  switch (effectId) {
    case "damage":
      return 2.0;
    case "all":
      return 1.5;
    case "heal":
    case "shield":
    case "poison":
    case "regen":
      return 1.0;
    case "haste":
    case "slow":
    case "re_slow":
    case "re_hasted":
    case "on_over_heal":
      return 0.5;
    case "on_crit":
      return 0.4;
    case "on_battle_start":
    case "every_100_damage":
    case "every_100_heal":
    case "every_100_shield":
    case "every_10_poison":
    case "every_10_regen":
      return 1.0;
    default:
      return 0.5;
  }
}

/** Number of potential trigger sources for a reaction position §7.1. */
export function sourceCount(position: string): number {
  switch (position) {
    case "enemies":
      return 9;
    case "allies":
    case "all":
      return 8;
    case "row_allies":
    case "column_allies":
      return 3;
    default:
      return 1;
  }
}

/** Budget cost of one effect use (§9 baseline × targeting multiplier). */
export function effectValue(effect: EffectLike, power: number): number {
  const mult = targetMultiplier(effect.targets?.id ?? "self");
  const cond = conditionalDiscount(effect);
  switch (effect.id) {
    case "damage":
    case "heal":
      return 2 * power * mult;
    case "shield":
      return 1.6 * power * mult;
    case "poison":
    case "regen":
      return 2 * power * mult;
    case "haste":
    case "slow":
      return 15 * ((effect.duration ?? 0) / 1000) * mult * cond;
    case "charge":
      return 22 * ((effect.duration ?? 0) / 1000) * mult;
    case "increase_power":
    case "decrease_power":
      return (effect.permanent ? 10 : 4) * (effect.amount ?? 0) * mult;
    case "increase_critical":
      return 4 * (effect.amount ?? 0) * mult;
    case "multiply_power":
      // Multiplies exponentially (feeds off charge/haste) — price it high so
      // only rare, slow gold units can afford it.
      return 8 * ((effect.multiplier ?? 1) - 1) * power * mult * cond;
    case "distribute_power":
      return 80 * mult;
    case "absorb_power":
      return 120 * mult;
    default:
      return 0;
  }
}

/** Reaction power per 5s §7 — R × T × D (D = 0.9 for the 200 ms delay). */
export function reactionValue(reaction: ReactionLike, power: number): number {
  const triggers =
    Math.sqrt(sourceCount(reaction.position)) *
    baseFrequency(reaction.effectId);
  const perTrigger = reaction.effects.reduce(
    (sum, e) => sum + effectValue(e, power),
    0,
  );
  return perTrigger * triggers * 0.9;
}

/** Actual Power per 5s §8 — action power × cadence + reaction power. */
export function actualPower(card: CardDefinition): number {
  const power = card.power || 0;
  const cooldownSeconds = (card.cooldown || 5000) / 1000;
  const actions = card.effects.reduce(
    (sum, e) => sum + effectValue(e as EffectLike, power),
    0,
  );
  const reactions = card.reactions.reduce(
    (sum, r) => sum + reactionValue(r as ReactionLike, power),
    0,
  );
  return actions * (5 / cooldownSeconds) + reactions;
}
