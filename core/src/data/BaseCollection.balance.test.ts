/// <reference types="jest" />

/**
 * Balance validation for the BaseCollection.
 *
 * Implements the Actual Power (AP) model from docs/unit-balance.md against the
 * static card data so regressions in unit tuning are caught at test time.
 *
 * Tier design intent (rank = tier, max rank 4 = platinum):
 * - bronze (rank 1): reliable base units, budget ~90–110 AP
 * - silver (rank 2): situational synergy units
 * - gold (rank 3): powerful build-around units
 * - bronze can be upgraded the most times, so a bronze invested up to gold
 *   must out-power a unit that starts at gold (enforced by the upgrade-payoff
 *   assertion below).
 */

import { ALL_CARDS } from "./BaseCollection";
import { CardDefinition } from "../Models";
import { validateCardDefinition } from "../Entities/Card";

type EffectLike = {
  id: string;
  amount?: number;
  permanent?: boolean;
  duration?: number;
  multiplier?: number;
  targets?: { id: string; ofType?: string };
};

type ReactionLike = {
  effectId: string;
  position: string;
  effects: EffectLike[];
};

const TIER = { BRONZE: 1, SILVER: 2, GOLD: 3 } as const;

/** Budget bands per tier for the documented AP model (unit-balance.md §15). */
const AP_BANDS: Record<number, { min: number; max: number }> = {
  [TIER.BRONZE]: { min: 80, max: 160 },
  [TIER.SILVER]: { min: 120, max: 260 },
  [TIER.GOLD]: { min: 150, max: 320 },
};

/** Raw power caps per tier — keep the upgrade curve meaningful between tiers. */
const RAW_POWER_CAPS: Record<number, number> = {
  [TIER.BRONZE]: 50,
  [TIER.SILVER]: 75,
  [TIER.GOLD]: 90,
};

/**
 * Charge is intentionally weak-per-cast: at most 300 ms of cooldown progress.
 * Anything larger lets units fire constantly (see docs/unit-balance.md §17).
 */
const CHARGE_MAX_DURATION_MS = 300;

/** A charge reaction must key off a specific directional ally. */
const DIRECTIONAL_POSITIONS = new Set([
  "left_ally",
  "right_ally",
  "top_ally",
  "bottom_ally",
]);

/**
 * Power multiplication compounds exponentially (especially with charge/haste),
 * so it is restricted to gold build-around units that can only fire a handful
 * of times per 30s combat.
 */
const MULTIPLY_MIN_COOLDOWN_MS = 8000;

/**
 * Cards whose AP intentionally deviates from the budget model. The balance doc
 * explicitly allows flavor/risk units to sit outside the band (§9.1).
 */
const AP_ALLOWLIST = new Set([
  // Crit-battery: shield + crit column + crit column reaction. The doc's
  // 4×/crit pricing values it well above the bronze budget, but crit is a
  // probabilistic payoff and the unit has no defensive value beyond the shield.
  "gambler",
]);

// ---------------------------------------------------------------------------
// AP model (docs/unit-balance.md §§6–13)
// ---------------------------------------------------------------------------

/** Targeting multiplier §10 — √(number of possible targets), single = 1. */
function targetMultiplier(targetsId: string): number {
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
function conditionalDiscount(effect: EffectLike): number {
  const ofType = effect.targets?.ofType;
  return ofType && ofType !== "any" ? 0.7 : 1;
}

/** Base trigger frequency per source per 5s §7.1. */
function baseFrequency(effectId: string): number {
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
function sourceCount(position: string): number {
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
function effectValue(effect: EffectLike, power: number): number {
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
function reactionValue(reaction: ReactionLike, power: number): number {
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
function actualPower(card: CardDefinition): number {
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

const BASIC_ACTIONS = new Set(["damage", "heal", "shield", "poison", "regen"]);

/**
 * Pure tempo/support units that deliberately carry no basic action.
 * pixie_trickster (docs/wacky-content-plan.md A1) is the first: every cast is
 * haste + slow, so it has no damage/heal/shield/poison/regen by design.
 */
const NO_BASIC_ACTION_ALLOWLIST = new Set(["pixie_trickster"]);

const nonCoreCards = ALL_CARDS.filter((c) => !c.isCore);

function rankOf(card: CardDefinition): number {
  return card.rank || 1;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BaseCollection balance", () => {
  it("has exactly one core card per effect type and the expected card count", () => {
    const cores = ALL_CARDS.filter((c) => c.isCore);
    expect(cores).toHaveLength(6);
    // 64 bronze + 22 silver + 10 gold non-core cards
    expect(nonCoreCards).toHaveLength(96);
  });

  it("keeps more silvers than golds, with golds capped at ~12% of the pool", () => {
    // The silver tier is the situational-synergy tier; the gold tier is the rare
    // build-around tier. Golds must never outnumber silvers (docs §1). The gold
    // share of the pool should stay around 12% (Balatro's rare share is ~13%),
    // so the cap scales with the pool instead of being an absolute number.
    const silvers = nonCoreCards.filter((c) => rankOf(c) === TIER.SILVER);
    const golds = nonCoreCards.filter((c) => rankOf(c) === TIER.GOLD);
    expect(silvers.length).toBeGreaterThan(golds.length);
    expect(golds.length / nonCoreCards.length).toBeLessThanOrEqual(0.12);
  });

  it("caps effect slots at 3 (actions + reactions) per unit-balance.md §14", () => {
    for (const card of nonCoreCards) {
      const slots = card.effects.length + card.reactions.length;
      expect(slots).toBeLessThanOrEqual(3);
    }
  });

  it("gives every non-core card at least one basic action", () => {
    const failures = nonCoreCards
      .filter((card) => !card.effects.some((e) => BASIC_ACTIONS.has(e.id)))
      .filter((card) => !NO_BASIC_ACTION_ALLOWLIST.has(card.id))
      .map((card) => `${card.id} has no basic action`);
    expect(failures).toEqual([]);
  });

  it("passes structural card validation (no dead 'self' reactions)", () => {
    const issues = ALL_CARDS.flatMap((c) =>
      validateCardDefinition(c).map((issue) => `${c.id}: ${issue}`),
    );
    expect(issues).toEqual([]);
  });

  it("requires triggerTeam: 'enemy' for reactions positioned on enemies", () => {
    // Without triggerTeam: "enemy", a `position: "enemies"` reaction can never
    // fire (see processReactions in TriggerSystem) — the unit is silently weaker.
    const failures: string[] = [];
    for (const card of ALL_CARDS) {
      for (const reaction of card.reactions) {
        if (
          reaction.position === "enemies" &&
          reaction.triggerTeam !== "enemy"
        ) {
          failures.push(
            `${card.id}: "enemies" reaction must set triggerTeam: "enemy"`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("keeps raw power within tier caps so upgraded bronze out-powers native gold", () => {
    const failures: string[] = [];
    for (const card of nonCoreCards) {
      const rank = rankOf(card);
      if ((card.power || 0) > RAW_POWER_CAPS[rank]) {
        failures.push(
          `${card.id} (rank ${rank}) power ${card.power} exceeds cap ${RAW_POWER_CAPS[rank]}`,
        );
      }
    }
    expect(failures).toEqual([]);

    // Design rule: a bronze upgraded to rank 3 (3× base, linear model) must
    // out-power the strongest unit that starts at gold (rank 3).
    const maxBronzeBase = Math.max(
      ...nonCoreCards
        .filter((c) => rankOf(c) === TIER.BRONZE)
        .map((c) => c.power || 0),
    );
    const maxGoldBase = Math.max(
      ...nonCoreCards
        .filter((c) => rankOf(c) === TIER.GOLD)
        .map((c) => c.power || 0),
    );
    expect(maxBronzeBase * 3).toBeGreaterThanOrEqual(maxGoldBase);
  });

  it("caps charge amounts at 300ms so charge can't make units fire constantly", () => {
    const failures: string[] = [];
    const check = (effects: EffectLike[], cardId: string, where: string) => {
      for (const effect of effects) {
        if (
          effect.id === "charge" &&
          (effect.duration ?? 0) > CHARGE_MAX_DURATION_MS
        ) {
          failures.push(
            `${cardId}: ${where} charge ${effect.duration}ms exceeds ${CHARGE_MAX_DURATION_MS}ms cap`,
          );
        }
      }
    };
    for (const card of ALL_CARDS) {
      check(card.effects as EffectLike[], card.id, "action");
      card.reactions.forEach((r, i) =>
        check(r.effects as EffectLike[], card.id, `reaction #${i}`),
      );
    }
    expect(failures).toEqual([]);
  });

  it("requires charge reactions to key off a specific effect + directional ally", () => {
    // A broad trigger (any row/column/allies action) feeding charge fires far
    // too often. Charge reactions must watch one specific effect from one
    // directional ally, so the charge is rare and positional.
    const failures: string[] = [];
    for (const card of ALL_CARDS) {
      for (const reaction of card.reactions) {
        const grantsCharge = reaction.effects.some((e) => e.id === "charge");
        if (!grantsCharge) continue;
        if (reaction.effectId === "all") {
          failures.push(
            `${card.id}: charge reaction effectId must be specific (got "all")`,
          );
        }
        if (!DIRECTIONAL_POSITIONS.has(reaction.position)) {
          failures.push(
            `${card.id}: charge reaction position must be a directional ally (got "${reaction.position}")`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("restricts power multiplication to gold units with long cooldowns", () => {
    // multiply_power compounds exponentially (esp. with charge/haste), so it
    // must be a rare gold build-around unit that fires ≤3 times per 30s combat.
    const failures: string[] = [];
    for (const card of ALL_CARDS) {
      const hasMultiply =
        card.effects.some((e) => e.id === "multiply_power") ||
        card.reactions.some((r) =>
          r.effects.some((e) => e.id === "multiply_power"),
        );
      if (!hasMultiply) continue;
      if (rankOf(card) !== TIER.GOLD) {
        failures.push(`${card.id}: multiply_power is gold-only`);
      }
      if ((card.cooldown || 0) < MULTIPLY_MIN_COOLDOWN_MS) {
        failures.push(
          `${card.id}: multiply_power needs cooldown ≥ ${MULTIPLY_MIN_COOLDOWN_MS}ms (got ${card.cooldown})`,
        );
      }
    }
    expect(failures).toEqual([]);
  });

  it("keeps cards within their tier AP bands", () => {
    const failures: string[] = [];
    for (const card of nonCoreCards) {
      // Locked golds (and any future locked bronze) are intentionally extreme
      // build-arounds. Locked SILVERS, however, are ordinary pool cards once
      // unlocked — the silver identity rule (AP band [120, 260], card-system
      // roadmap §1) applies to them regardless of lock status.
      if (card.locked && rankOf(card) !== TIER.SILVER) continue;
      if (AP_ALLOWLIST.has(card.id)) continue;

      const rank = rankOf(card);
      const ap = actualPower(card);
      const band = AP_BANDS[rank];
      if (ap < band.min || ap > band.max) {
        failures.push(
          `${card.id} (rank ${rank}) AP ${ap.toFixed(0)} outside band [${band.min}, ${band.max}]`,
        );
      }
    }
    expect(failures).toEqual([]);
  });
});
