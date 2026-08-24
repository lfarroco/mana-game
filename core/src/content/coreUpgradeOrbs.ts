/**
 * Themed core-upgrade-orb catalog — pure data registry (no factories, no RNG).
 *
 * Each core ("crystal") carries an implicit theme, its basic-action family (see
 * docs/core-unit-onboarding.md §2). When the player upgrades their core, the
 * offered options come from that theme's pool: the theme's four identity orbs
 * (abilities removed from the simplified baseline plus on-theme twists) and the
 * three generic stat orbs shared by every theme's pool.
 *
 * This file only *defines* the catalog. Applying an orb to a core (appending
 * the effect/reaction, or calling the stat helpers) happens in a later phase
 * (CUB-B3 — OrbAndCoreUpgrades); seeded, theme-scoped option generation lands
 * in CUB-B1/B2.
 */

import type { CoreTheme, Effect, EffectReaction } from "../Models";
import {
  absorbPower,
  charge,
  column,
  damage,
  decreasePower,
  dispel,
  increaseCritical,
  increasePower,
  randomAlly,
  randomEnemy,
  reaction,
  self,
  shield,
  slow,
  strongestEnemy,
  trigger,
} from "../data/effectBuilders";

/**
 * A single core upgrade orb.
 *
 * Identity orbs carry an `effect` (kind "effect") or a `reaction`
 * (kind "reaction") that gets appended to the core's effects/reactions when
 * applied. Stat orbs (kind "stat") are the generic "bigger numbers" fallback
 * present in every theme's pool — they reference the existing stat helpers via
 * `stat`. `minRound` gates when an orb may appear in upgrade options (mirrors
 * encounter minRound); left unset on all current entries.
 */
export type CoreUpgradeDefinition = {
  id: string;
  /** The core theme this orb belongs to — the single filter key for pools. */
  theme: CoreTheme;
  kind: "effect" | "reaction" | "stat";
  /** Appended to the core's `effects` when applied (kind "effect"). */
  effect?: Effect;
  /** Appended to the core's `reactions` when applied (kind "reaction"). */
  reaction?: EffectReaction;
  /** Stat helper to call when applied (kind "stat"). */
  stat?:
    "increase_core_max_life" | "upgrade_core_power" | "decrease_core_cooldown";
  /** Round gate — orb may only appear in upgrade options from this round on. */
  minRound?: number;
};

// ---------------------------------------------------------------------------
// Identity orbs — 4 per theme (see docs/core-unit-onboarding.md §4 pool sketch;
// the overflow theme is the CUB-G1 Radiant Crystal pool, §9; the thorns theme
// is the CUB-G2 Verdant Crystal pool, §9; the void theme is the CUB-G3 Void
// Crystal pool, §9)
// ---------------------------------------------------------------------------

/**
 * All 36 identity orbs, keyed by id.
 *
 * Reactions with effectId "all" fire only on basic abilities (intended — these
 * are the removed baseline reactions). `shield`/`regen` bare builders fire as
 * their basic action; when `shield` fires from `on_over_heal` it shields the
 * source force's CORE (see addShield.ts) — correct for the overflow identity
 * orbs. Charge reactions positioned "allies" are fine here: the static-card
 * charge rule only checks ALL_CARDS, which excludes this catalog.
 */
export const CORE_UPGRADE_DEFINITIONS: Record<string, CoreUpgradeDefinition> = {
  // --- regen theme (mana_crystal): Column Growth, Reactive Charge, Overflow Shield, Regen Charge ---
  mana_column_growth: {
    id: "mana_column_growth",
    theme: "regen",
    kind: "effect",
    effect: increasePower(10, column),
  },
  mana_reactive_charge: {
    id: "mana_reactive_charge",
    theme: "regen",
    kind: "reaction",
    reaction: reaction("damage", "left_ally", charge(200, self)),
  },
  mana_overflow_shield: {
    id: "mana_overflow_shield",
    theme: "regen",
    kind: "reaction",
    reaction: reaction("on_over_heal", "allies", shield),
  },
  mana_regen_charge: {
    id: "mana_regen_charge",
    theme: "regen",
    kind: "reaction",
    reaction: reaction("every_10_regen", "allies", charge(300, randomAlly(1))),
  },

  // --- damage theme (critical_crystal): Crit Column, Row Power, Crit Power, Crit Slow ---
  crit_crit_column: {
    id: "crit_crit_column",
    theme: "damage",
    kind: "effect",
    effect: increaseCritical(5, column),
  },
  crit_row_power: {
    id: "crit_row_power",
    theme: "damage",
    kind: "reaction",
    reaction: reaction("all", "row_allies", increasePower(5, column)),
  },
  crit_crit_power: {
    id: "crit_crit_power",
    theme: "damage",
    kind: "reaction",
    reaction: reaction("on_crit", "allies", increasePower(5, self)),
  },
  crit_crit_slow: {
    id: "crit_crit_slow",
    theme: "damage",
    kind: "reaction",
    reaction: reaction("on_crit", "allies", slow(1000, randomEnemy(1))),
  },

  // --- shield theme (protective_crystal): Shield Ally Power, Shield Trigger Power, Shield Power, Overflow Shield ---
  shield_ally_power: {
    id: "shield_ally_power",
    theme: "shield",
    kind: "effect",
    effect: increasePower(5, randomAlly(1), true),
  },
  shield_trigger_power: {
    id: "shield_trigger_power",
    theme: "shield",
    kind: "reaction",
    reaction: reaction("all", "row_allies", increasePower(5, trigger)),
  },
  shield_power: {
    id: "shield_power",
    theme: "shield",
    kind: "reaction",
    reaction: reaction("every_100_shield", "allies", increasePower(5, self)),
  },
  shield_overflow: {
    id: "shield_overflow",
    theme: "shield",
    kind: "reaction",
    reaction: reaction("on_over_heal", "allies", shield),
  },

  // --- heal theme (growth_crystal): Growth Column, Growth Trigger, Overflow Power, Heal Power ---
  heal_growth_column: {
    id: "heal_growth_column",
    theme: "heal",
    kind: "effect",
    effect: increasePower(2, column, true),
  },
  heal_growth_trigger: {
    id: "heal_growth_trigger",
    theme: "heal",
    kind: "reaction",
    reaction: reaction("all", "row_allies", increasePower(5, trigger)),
  },
  heal_overflow_power: {
    id: "heal_overflow_power",
    theme: "heal",
    kind: "reaction",
    reaction: reaction("on_over_heal", "allies", increasePower(5, self)),
  },
  heal_power: {
    id: "heal_power",
    theme: "heal",
    kind: "reaction",
    reaction: reaction("every_100_heal", "allies", increasePower(5, self)),
  },

  // --- poison theme (purple_crystal): Slow Enemy, Slow Power, Poison Power, Re-Slow Drain ---
  poison_slow_enemy: {
    id: "poison_slow_enemy",
    theme: "poison",
    kind: "effect",
    effect: slow(1000, randomEnemy(1)),
  },
  poison_slow_power: {
    id: "poison_slow_power",
    theme: "poison",
    kind: "reaction",
    reaction: reaction("slow", "allies", increasePower(4, trigger, true)),
  },
  poison_power: {
    id: "poison_power",
    theme: "poison",
    kind: "reaction",
    reaction: reaction("every_10_poison", "allies", increasePower(5, self)),
  },
  poison_re_slow_drain: {
    id: "poison_re_slow_drain",
    theme: "poison",
    kind: "reaction",
    reaction: reaction("re_slow", "allies", decreasePower(5, randomEnemy(1))),
  },

  // --- haste theme (quickstone): Haste Charge, Re-Haste Crit, Re-Haste Power ---
  // (quickstone's baseline itself carries the regen pair — the absolute
  // basic-effect rule — so the haste pool has no Regen identity orb; see
  // docs/core-unit-onboarding.md §2 decision 4.)
  haste_charge: {
    id: "haste_charge",
    theme: "haste",
    kind: "reaction",
    reaction: reaction("haste", "right_ally", charge(200, column)),
  },
  haste_rehaste_crit: {
    id: "haste_rehaste_crit",
    theme: "haste",
    kind: "reaction",
    reaction: reaction("re_hasted", "allies", increaseCritical(5, self)),
  },
  haste_rehaste_power: {
    id: "haste_rehaste_power",
    theme: "haste",
    kind: "reaction",
    reaction: reaction("re_hasted", "allies", increasePower(5, self)),
  },

  // --- overflow theme (radiant_crystal): Overflow Shield, Overflow Burst,
  // --- Saturation, Overflow Charge (CUB-G1, docs/core-unit-onboarding.md §9) ---
  radiant_overflow_shield: {
    id: "radiant_overflow_shield",
    theme: "overflow",
    kind: "reaction",
    reaction: reaction("on_over_heal", "allies", shield),
  },
  radiant_overflow_burst: {
    id: "radiant_overflow_burst",
    theme: "overflow",
    kind: "reaction",
    reaction: reaction("on_over_heal", "allies", damage),
  },
  radiant_saturation: {
    id: "radiant_saturation",
    theme: "overflow",
    kind: "reaction",
    reaction: reaction("every_100_heal", "allies", increasePower(5, self)),
  },
  radiant_overflow_charge: {
    id: "radiant_overflow_charge",
    theme: "overflow",
    kind: "reaction",
    reaction: reaction("every_100_heal", "allies", charge(300, randomAlly(1))),
  },

  // --- thorns theme (verdant_crystal): Thorns, Thorn Shield, Retaliation,
  // --- Vengeful Charge (CUB-G2, docs/core-unit-onboarding.md §9) ---
  // All four react on_crystal_hit — the C2 trigger emitted when the crystal
  // actually takes damage (docs/wacky-content-plan.md). position "enemies" +
  // triggerTeam "enemy" fires the reaction on the defending force (the crystal
  // itself is an enemy of whoever dealt the hit); the dealDamage loop guard
  // keeps reaction-sourced thorns damage from ping-ponging.
  verdant_thorns: {
    id: "verdant_thorns",
    theme: "thorns",
    kind: "reaction",
    reaction: reaction("on_crystal_hit", "enemies", damage, "enemy"),
  },
  verdant_thorn_shield: {
    id: "verdant_thorn_shield",
    theme: "thorns",
    kind: "reaction",
    reaction: reaction("on_crystal_hit", "enemies", shield, "enemy"),
  },
  verdant_retaliation: {
    id: "verdant_retaliation",
    theme: "thorns",
    kind: "reaction",
    reaction: reaction(
      "on_crystal_hit",
      "enemies",
      increasePower(5, self),
      "enemy",
    ),
  },
  verdant_vengeful_charge: {
    id: "verdant_vengeful_charge",
    theme: "thorns",
    kind: "reaction",
    reaction: reaction(
      "on_crystal_hit",
      "enemies",
      charge(300, randomAlly(1)),
      "enemy",
    ),
  },

  // --- void theme (void_crystal): Leech, Power Drain, Dispel, Weakness ---
  // (CUB-G3, docs/core-unit-onboarding.md §9) — the disruption / power-theft
  // identity. Leech reuses the A3 cross-force pattern (enemy heal → your
  // shield); Power Drain and Dispel are effect orbs appended to the baseline
  // decrease_power cast (absorb_power steals 25% of the strongest enemy's
  // power; dispel is the D2 status-stripper); Weakness saps the strongest
  // enemy whenever any ally casts a basic ability.
  void_leech: {
    id: "void_leech",
    theme: "void",
    kind: "reaction",
    reaction: reaction("heal", "enemies", shield, "enemy"),
  },
  void_power_drain: {
    id: "void_power_drain",
    theme: "void",
    kind: "effect",
    effect: absorbPower(strongestEnemy),
  },
  void_dispel: {
    id: "void_dispel",
    theme: "void",
    kind: "effect",
    effect: dispel(strongestEnemy),
  },
  void_weakness: {
    id: "void_weakness",
    theme: "void",
    kind: "reaction",
    reaction: reaction("all", "allies", decreasePower(5, strongestEnemy)),
  },
};

/**
 * All core-upgrade-orb ids — the identity orbs keyed in
 * CORE_UPGRADE_DEFINITIONS. Used as PhaseOption ids when offering themed core
 * upgrades (CUB-B1/B2).
 */
export type CoreUpgradeOrbId = keyof typeof CORE_UPGRADE_DEFINITIONS;

// ---------------------------------------------------------------------------
// Generic stat orbs & per-theme pool accessor
// ---------------------------------------------------------------------------

/**
 * Generic stat orbs shared by every theme's pool — the "bigger numbers"
 * fallback (they already exist as orb/stat definitions elsewhere).
 */
export const CORE_STAT_ORBS = [
  "increase_core_max_life",
  "upgrade_core_power",
  "decrease_core_cooldown",
] as const;

/**
 * The full upgrade-orb pool for a theme: its four identity orbs (in definition
 * order) followed by the three generic stat orbs. Deterministic — used by
 * CUB-B1's seeded option generation.
 */
export function getThemeUpgradePool(theme: CoreTheme): CoreUpgradeDefinition[] {
  const identityOrbs = Object.values(CORE_UPGRADE_DEFINITIONS).filter(
    (def) => def.theme === theme && def.kind !== "stat",
  );
  const statOrbs: CoreUpgradeDefinition[] = CORE_STAT_ORBS.map((stat) => ({
    id: stat,
    theme,
    kind: "stat",
    stat,
  }));
  return [...identityOrbs, ...statOrbs];
}
