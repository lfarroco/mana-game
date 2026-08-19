/// <reference types="jest" />

/**
 * Balance validation for the BaseCollection.
 *
 * Applies the Actual Power (AP) model from docs/unit-balance.md (shared
 * pricing helpers in ./apModel.ts) against the static card data so regressions
 * in unit tuning are caught at test time.
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
import { actualPower, EffectLike } from "./apModel";

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
  // Crit-battery: shield + random-ally crit on cast (the coin-flip) + crit
  // column reaction. The doc's 4×/crit pricing values it well above the bronze
  // budget, but crit is a probabilistic payoff and the unit has no defensive
  // value beyond the shield.
  "gambler",
  // Twisted Mirror gamble: multiplies the strongest ally AND the strongest
  // enemy — the double-edged self-harm (it helps the enemy too) makes it
  // unpricable by the AP model; the risk is the whole point.
  "fate_shifter",
]);

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
    // 64 bronze + 24 silver + 11 gold non-core cards
    expect(nonCoreCards).toHaveLength(99);
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

  it("caps effect repeats at 3 and reserves them for gold or very slow cards", () => {
    // C1 (docs/wacky-content-plan.md): `repeat` re-fires an effect N times per
    // cast. Mirrors the multiply_power discipline — repeat compounds output, so
    // it is restricted to gold build-arounds or units so slow they can barely
    // cast at all. (The AP model prices repeat linearly, so the band test
    // catches over-tuned repeats too.)
    const failures: string[] = [];
    const REPEAT_MAX = 3;
    const REPEAT_MIN_COOLDOWN_MS = 8000;
    for (const card of ALL_CARDS) {
      const repeated = [
        ...card.effects,
        ...card.reactions.flatMap((r) => r.effects),
      ].filter((e) => (e.repeat ?? 1) > 1);
      for (const effect of repeated) {
        const count = effect.repeat ?? 1;
        if (count > REPEAT_MAX) {
          failures.push(
            `${card.id}: repeat ${count} exceeds cap ${REPEAT_MAX}`,
          );
        }
        const allowed =
          rankOf(card) === TIER.GOLD ||
          (card.cooldown || 0) >= REPEAT_MIN_COOLDOWN_MS;
        if (!allowed) {
          failures.push(
            `${card.id}: repeat ${count} requires gold rank or cooldown ≥ ${REPEAT_MIN_COOLDOWN_MS}ms (got ${card.cooldown})`,
          );
        }
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
