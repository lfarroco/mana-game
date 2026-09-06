/**
 * Themed core-upgrade-orb catalog — pure data registry (no factories, no RNG).
 *
 * Each core ("crystal") carries an implicit theme, its basic-action family (see
 * docs/core-unit-onboarding.md §2). When the player upgrades their core, the
 * offered options come from that theme's pool: the theme's identity orbs (seven
 * per theme, six for haste — abilities removed from the simplified baseline
 * plus on-theme twists) and the three generic stat orbs shared by every theme's
 * pool.
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
  haste,
  heal,
  increaseCritical,
  increasePower,
  poison,
  randomAlly,
  randomEnemy,
  reaction,
  regen,
  self,
  shield,
  silence,
  slow,
  strongestEnemy,
  trigger,
  weakestAlly,
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
// Identity orbs — 9 per theme, 8 for haste (see docs/core-unit-onboarding.md
// §4 pool sketch; the overflow theme is the CUB-G1 Radiant Crystal pool, §9;
// the thorns theme is the CUB-G2 Verdant Crystal pool, §9; the void theme is
// the CUB-G3 Void Crystal pool, §9). The 2026-08-30 variety pass added two
// cross-mechanic orbs per theme so the "every_X → charge/haste/power" tempo
// template is diluted and each pool offers genuinely different responses.
// ---------------------------------------------------------------------------

/**
 * All 80 identity orbs, keyed by id.
 *
 * Reactions with effectId "all" fire only on basic abilities (intended — these
 * are the removed baseline reactions). `shield`/`regen` bare builders fire as
 * their basic action; when `shield` fires from `on_over_heal` it shields the
 * source force's CORE (see addShield.ts) — correct for the overflow identity
 * orbs.
 *
 * Charge/haste discipline (docs/unit-balance.md §17, extended to orbs
 * 2026-09-06 after the player-reported threshold-tempo infinite): threshold
 * triggers (every_*) must NEVER grant charge or haste — team-stat counters
 * feed back into cast speed (stat → threshold → tempo → faster casts → more
 * stat) and ignite board-wide infinites that only the runaway guard catches.
 * Tempo orbs key off a specific effect from a directional ally instead
 * (e.g. "regen" from "left_ally"), mirroring the static-card charge rule.
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
    reaction: reaction("regen", "left_ally", charge(300, self)),
  },
  // --- regen additions (2026-08-25 variety pass): sustain → growth / tempo ---
  mana_regen_power: {
    id: "mana_regen_power",
    theme: "regen",
    kind: "reaction",
    reaction: reaction("every_10_regen", "allies", increasePower(5, self)),
  },
  mana_regen_haste: {
    id: "mana_regen_haste",
    theme: "regen",
    kind: "reaction",
    reaction: reaction("regen", "left_ally", haste(500, self)),
  },
  mana_weave: {
    id: "mana_weave",
    theme: "regen",
    kind: "effect",
    effect: increasePower(2, column, true),
  },
  // --- regen additions (2026-08-30 variety pass): sustain → offense / defense.
  // Two more every_10_regen responses (poison, shield) so the regen pool's
  // five same-trigger orbs offer five DIFFERENT responses — assembling the
  // charge+power+haste tempo engine is diluted, and regen gains cross-mechanic
  // play. mana_reactive_ward is the defensive twin of mana_reactive_charge. ---
  mana_regen_venom: {
    id: "mana_regen_venom",
    theme: "regen",
    kind: "reaction",
    reaction: reaction("every_10_regen", "allies", poison),
  },
  mana_reactive_ward: {
    id: "mana_reactive_ward",
    theme: "regen",
    kind: "reaction",
    reaction: reaction("damage", "left_ally", shield),
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
  // --- damage additions (2026-08-25 variety pass): crits → speed / drain ---
  crit_damage_power: {
    id: "crit_damage_power",
    theme: "damage",
    kind: "reaction",
    reaction: reaction("every_100_damage", "allies", increasePower(5, self)),
  },
  crit_crit_haste: {
    id: "crit_crit_haste",
    theme: "damage",
    kind: "reaction",
    reaction: reaction("on_crit", "allies", haste(500, randomAlly(1))),
  },
  crit_crit_weaken: {
    id: "crit_crit_weaken",
    theme: "damage",
    kind: "reaction",
    reaction: reaction("on_crit", "allies", decreasePower(4, randomEnemy(1))),
  },
  // --- damage additions (2026-08-30 variety pass): retaliation & power theft.
  // crit_thorns gives the damage crystal a thorns-lite trigger (on_crystal_hit
  // is new to this theme); crit_crit_siphon turns crits into cross-force power
  // theft instead of another self buff. ---
  crit_thorns: {
    id: "crit_thorns",
    theme: "damage",
    kind: "reaction",
    reaction: reaction("on_crystal_hit", "enemies", damage, "enemy"),
  },
  crit_crit_siphon: {
    id: "crit_crit_siphon",
    theme: "damage",
    kind: "reaction",
    reaction: reaction("on_crit", "allies", absorbPower(strongestEnemy)),
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
  // --- shield additions (2026-08-25 variety pass): shielding → team tempo ---
  shield_haste: {
    id: "shield_haste",
    theme: "shield",
    kind: "reaction",
    reaction: reaction("shield", "left_ally", haste(500, self)),
  },
  shield_charge: {
    id: "shield_charge",
    theme: "shield",
    kind: "reaction",
    reaction: reaction("shield", "left_ally", charge(200, self)),
  },
  shield_bastion: {
    id: "shield_bastion",
    theme: "shield",
    kind: "effect",
    effect: increasePower(5, weakestAlly, true),
  },
  // --- shield additions (2026-08-30 variety pass): protection from ally heals
  // and permanent growth from being hit — distinct triggers (heal,
  // on_crystal_hit) instead of another every_100_shield tempo orb. ---
  shield_repair: {
    id: "shield_repair",
    theme: "shield",
    kind: "reaction",
    reaction: reaction("heal", "allies", shield),
  },
  shield_retribution: {
    id: "shield_retribution",
    theme: "shield",
    kind: "reaction",
    reaction: reaction(
      "on_crystal_hit",
      "enemies",
      increasePower(3, self, true),
      "enemy",
    ),
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
  // --- heal additions (2026-08-25 variety pass): healing → tempo / growth ---
  heal_heal_charge: {
    id: "heal_heal_charge",
    theme: "heal",
    kind: "reaction",
    reaction: reaction("heal", "left_ally", charge(300, self)),
  },
  heal_heal_haste: {
    id: "heal_heal_haste",
    theme: "heal",
    kind: "reaction",
    reaction: reaction("heal", "left_ally", haste(500, self)),
  },
  heal_vitality: {
    id: "heal_vitality",
    theme: "heal",
    kind: "effect",
    effect: increasePower(5, self, true),
  },
  // --- heal additions (2026-08-30 variety pass): self-repair and cleanse.
  // heal_second_wind (on_crystal_hit → heal) makes the growth crystal a
  // self-repairing tank; heal_purifying converts the every_100_heal trigger
  // into disruption (dispel) instead of another power/tempo orb. ---
  heal_second_wind: {
    id: "heal_second_wind",
    theme: "heal",
    kind: "reaction",
    reaction: reaction("on_crystal_hit", "enemies", heal, "enemy"),
  },
  heal_purifying: {
    id: "heal_purifying",
    theme: "heal",
    kind: "reaction",
    reaction: reaction("every_100_heal", "allies", dispel(strongestEnemy)),
  },

  // --- poison theme (purple_crystal): Slow Power, Poison Power, Re-Slow Drain ---
  // (The former `poison_slow_enemy` effect orb moved into purple_crystal's
  // baseline in the 2026-08-28 basic-crystal balance pass — slow(1000,
  // randomEnemy) is now the crystal's simple action. Its replacement is
  // `poison_re_slow_haste`: allies who re-slow hand out haste, a fresh tempo
  // angle for the poison pool.)
  poison_re_slow_haste: {
    id: "poison_re_slow_haste",
    theme: "poison",
    kind: "reaction",
    reaction: reaction("re_slow", "allies", haste(500, randomAlly(1))),
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
  // --- poison additions (2026-08-25 variety pass): venom → tempo / drain ---
  poison_haste: {
    id: "poison_haste",
    theme: "poison",
    kind: "reaction",
    reaction: reaction("poison", "left_ally", haste(500, self)),
  },
  poison_charge: {
    id: "poison_charge",
    theme: "poison",
    kind: "reaction",
    reaction: reaction("poison", "left_ally", charge(300, self)),
  },
  poison_venom: {
    id: "poison_venom",
    theme: "poison",
    kind: "reaction",
    reaction: reaction("slow", "allies", decreasePower(4, randomEnemy(1))),
  },
  // --- poison additions (2026-08-30 variety pass): spread & revenge.
  // poison_plague re-poisons off allied crits (cast-triggered, so the
  // no-reaction-to-reactions rule keeps it a spread, not a loop);
  // poison_revenge punishes the ENEMY's poison accumulation by sapping its
  // strongest unit. ---
  poison_plague: {
    id: "poison_plague",
    theme: "poison",
    kind: "reaction",
    reaction: reaction("on_crit", "allies", poison),
  },
  poison_revenge: {
    id: "poison_revenge",
    theme: "poison",
    kind: "reaction",
    reaction: reaction(
      "every_10_poison",
      "enemies",
      decreasePower(3, strongestEnemy),
      "enemy",
    ),
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
  // --- haste additions (2026-08-25 variety pass): hasting → power / tempo ---
  haste_haste_power: {
    id: "haste_haste_power",
    theme: "haste",
    kind: "reaction",
    reaction: reaction("haste", "allies", increasePower(4, trigger, true)),
  },
  haste_haste_charge: {
    id: "haste_haste_charge",
    theme: "haste",
    kind: "reaction",
    reaction: reaction("haste", "allies", charge(200, randomAlly(1))),
  },
  haste_speed_column: {
    id: "haste_speed_column",
    theme: "haste",
    kind: "effect",
    effect: haste(1000, column),
  },
  // --- haste additions (2026-08-30 variety pass): tempo gap & anti-slow.
  // haste_haste_slow widens the tempo gap (hasting allies slows the enemy);
  // haste_clockwork undoes enemy slows on allies (charge the slowed ally)
  // rather than stacking another raw-haste orb. ---
  haste_haste_slow: {
    id: "haste_haste_slow",
    theme: "haste",
    kind: "reaction",
    reaction: reaction("haste", "allies", slow(500, randomEnemy(1))),
  },
  haste_clockwork: {
    id: "haste_clockwork",
    theme: "haste",
    kind: "reaction",
    reaction: reaction("slow", "allies", charge(150, trigger)),
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
    reaction: reaction("heal", "right_ally", charge(300, self)),
  },
  // --- overflow additions (2026-08-25 variety pass): overflow → team growth / tempo ---
  radiant_radiance: {
    id: "radiant_radiance",
    theme: "overflow",
    kind: "reaction",
    reaction: reaction(
      "on_over_heal",
      "allies",
      increasePower(5, weakestAlly, true),
    ),
  },
  radiant_overflow_haste: {
    id: "radiant_overflow_haste",
    theme: "overflow",
    kind: "reaction",
    reaction: reaction("on_over_heal", "allies", haste(500, randomAlly(1))),
  },
  radiant_overflow_slow: {
    id: "radiant_overflow_slow",
    theme: "overflow",
    kind: "reaction",
    reaction: reaction("on_over_heal", "allies", slow(1000, randomEnemy(1))),
  },
  // --- overflow additions (2026-08-30 variety pass): overflow → sustain /
  // disruption. radiant_overflow_regen converts overheal into regen (heal the
  // crystal over time); radiant_overflow_drain saps the strongest enemy on
  // overheal instead of yet another power/haste tempo orb. ---
  radiant_overflow_regen: {
    id: "radiant_overflow_regen",
    theme: "overflow",
    kind: "reaction",
    reaction: reaction("on_over_heal", "allies", regen),
  },
  radiant_overflow_drain: {
    id: "radiant_overflow_drain",
    theme: "overflow",
    kind: "reaction",
    reaction: reaction(
      "on_over_heal",
      "allies",
      decreasePower(3, strongestEnemy),
    ),
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
  // --- thorns additions (2026-08-25 variety pass): being hit → more punishment ---
  verdant_thorn_power: {
    id: "verdant_thorn_power",
    theme: "thorns",
    kind: "reaction",
    reaction: reaction(
      "on_crystal_hit",
      "enemies",
      increasePower(4, self, true),
      "enemy",
    ),
  },
  verdant_thorn_slow: {
    id: "verdant_thorn_slow",
    theme: "thorns",
    kind: "reaction",
    reaction: reaction(
      "on_crystal_hit",
      "enemies",
      slow(1000, randomEnemy(1)),
      "enemy",
    ),
  },
  verdant_thorn_haste: {
    id: "verdant_thorn_haste",
    theme: "thorns",
    kind: "reaction",
    reaction: reaction(
      "on_crystal_hit",
      "enemies",
      haste(500, randomAlly(1)),
      "enemy",
    ),
  },
  // --- thorns additions (2026-08-30 variety pass): being hit → poison / theft.
  // Same on_crystal_hit trigger, new responses: verdant_thorn_poison makes the
  // attacker's crystal rot, verdant_thorn_drain steals its strongest unit's
  // power — retaliations that don't stack into the damage-reflection engine. ---
  verdant_thorn_poison: {
    id: "verdant_thorn_poison",
    theme: "thorns",
    kind: "reaction",
    reaction: reaction("on_crystal_hit", "enemies", poison, "enemy"),
  },
  verdant_thorn_drain: {
    id: "verdant_thorn_drain",
    theme: "thorns",
    kind: "reaction",
    reaction: reaction(
      "on_crystal_hit",
      "enemies",
      absorbPower(strongestEnemy),
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
  // --- void additions (2026-08-25 variety pass): ally casts → more disruption ---
  void_power_sap: {
    id: "void_power_sap",
    theme: "void",
    kind: "effect",
    effect: decreasePower(8, strongestEnemy),
  },
  void_shadow_slow: {
    id: "void_shadow_slow",
    theme: "void",
    kind: "reaction",
    reaction: reaction("all", "allies", slow(1000, strongestEnemy)),
  },
  void_shadow_haste: {
    id: "void_shadow_haste",
    theme: "void",
    kind: "reaction",
    reaction: reaction("all", "allies", haste(500, self)),
  },
  // --- void additions (2026-08-30 variety pass): ally casts → silence /
  // counter-tempo. void_nullify silences the strongest enemy whenever an ally
  // casts a basic ability (disruption, not power theft); void_shadow_step
  // hastes the crystal when allies slow the enemy. ---
  void_nullify: {
    id: "void_nullify",
    theme: "void",
    kind: "reaction",
    reaction: reaction("all", "allies", silence(1000, strongestEnemy)),
  },
  void_shadow_step: {
    id: "void_shadow_step",
    theme: "void",
    kind: "reaction",
    reaction: reaction("slow", "allies", haste(500, self)),
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
 * The full upgrade-orb pool for a theme: its identity orbs (in definition
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
