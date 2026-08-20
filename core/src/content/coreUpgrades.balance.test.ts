/// <reference types="jest" />

/**
 * Balance gate for the themed core-upgrade-orb catalog (CUB-C1).
 *
 * docs/core-unit-onboarding.md §7 gives cores their own AP band — [150, 500]
 * AP per 5s for a fully-built core (baseline + 2–3 themed orbs), versus the
 * bronze [80, 160] band. Cores are excluded from the static-card AP bands in
 * BaseCollection.balance.test.ts; this test prices each identity orb's
 * *marginal* AP — AP(core + orb) − AP(core baseline) — against the band so a
 * single over-tuned orb is caught before it can blow the fully-built core out
 * of the ceiling.
 *
 * Pricing uses the shared AP model in ../data/apModel.ts, the same formulas as
 * the static-card balance gate. Stat orbs (increase_core_max_life /
 * upgrade_core_power / decrease_core_cooldown) are NOT priced here: their
 * payoff is round-dependent (upgrade_core_power scales with round × 10) and
 * repeatable, so they are the "bigger numbers" fallback rather than banded
 * content.
 */

import { ALL_CARDS } from "../data/BaseCollection";
import { CardDefinition, CoreTheme } from "../Models";
import { actualPower } from "../data/apModel";
import { CoreUpgradeDefinition, getThemeUpgradePool } from "./coreUpgradeOrbs";

/**
 * docs/core-unit-onboarding.md §7 — cores run ~2–3× a bronze's output. Bronze
 * max is 160 AP, so a fully-built core (baseline + 2–3 themed orbs) is allowed
 * [150, 500] AP per 5s.
 */
const CORE_AP_BAND = { min: 150, max: 500 } as const;

/**
 * Identity orbs the AP model genuinely cannot price (risk/flavor) are exempted
 * from the marginal-AP gates, with a written justification — mirrors
 * AP_ALLOWLIST in BaseCollection.balance.test.ts (card-design-philosophy.md
 * §6).
 *
 * Currently empty: every identity orb prices in-band (see the ledger test
 * below for each orb's exact marginal AP).
 */
const CORE_UPGRADE_ALLOWLIST = new Set<string>([]);

/** The player-facing cores, keyed by their theme (one per CoreTheme). */
const CORES_BY_THEME = new Map<CoreTheme, CardDefinition>();
for (const card of ALL_CARDS) {
  if (card.isCore && card.coreTheme) {
    CORES_BY_THEME.set(card.coreTheme, card);
  }
}

/** The four identity orbs in a theme's pool (excludes the generic stat orbs). */
function identityOrbs(theme: CoreTheme): CoreUpgradeDefinition[] {
  return getThemeUpgradePool(theme).filter((orb) => orb.kind !== "stat");
}

/**
 * Clone of the core card with one identity orb's payload applied — mirrors the
 * mutation in OrbAndCoreUpgrades.applyCoreUpgrade (append effect/reaction)
 * without mutating the shared card definition.
 */
function coreWithOrb(
  core: CardDefinition,
  orb: CoreUpgradeDefinition,
): CardDefinition {
  if (orb.kind === "effect" && orb.effect) {
    return { ...core, effects: [...core.effects, orb.effect] };
  }
  if (orb.kind === "reaction" && orb.reaction) {
    return { ...core, reactions: [...core.reactions, orb.reaction] };
  }
  throw new Error(`balance gate: ${orb.id} has no effect/reaction payload`);
}

/** Marginal AP of a single identity orb: AP(core + orb) − AP(core baseline). */
function marginalAp(core: CardDefinition, orb: CoreUpgradeDefinition): number {
  return actualPower(coreWithOrb(core, orb)) - actualPower(core);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("core upgrade balance (CUB-C1)", () => {
  it("maps every core theme to exactly one core card with 4 identity orbs", () => {
    expect(CORES_BY_THEME.size).toBe(9);
    for (const [theme, core] of CORES_BY_THEME) {
      expect(core.isCore).toBe(true);
      expect(identityOrbs(theme)).toHaveLength(4);
    }
  });

  it("prices every identity orb's marginal AP within the core band", () => {
    // A single over-tuned orb would push AP(core + orb) past the fully-built
    // ceiling. Each orb must also be a real upgrade (marginal ≥ 0), not a
    // net-nerf payload.
    const failures: string[] = [];
    for (const [theme, core] of CORES_BY_THEME) {
      const baseline = actualPower(core);
      for (const orb of identityOrbs(theme)) {
        if (CORE_UPGRADE_ALLOWLIST.has(orb.id)) continue;
        const marginal = marginalAp(core, orb);
        const built = baseline + marginal;
        if (built > CORE_AP_BAND.max) {
          failures.push(
            `${orb.id}: baseline ${baseline.toFixed(0)} + marginal ${marginal.toFixed(1)} = ${built.toFixed(0)} exceeds band max ${CORE_AP_BAND.max}`,
          );
        }
        if (marginal < 0) {
          failures.push(
            `${orb.id}: marginal AP ${marginal.toFixed(1)} is negative — the orb is a net nerf`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("keeps fully-built cores (baseline + strongest 3 orbs) within the band", () => {
    // The band describes a fully-built core: baseline + 2–3 themed orbs. The
    // strongest three identity orbs of a theme is the top of its build space,
    // so that must land inside [150, 500] (and no lower than 150 — the theme
    // must meaningfully out-power a bronze by the time it's built).
    const failures: string[] = [];
    for (const [theme, core] of CORES_BY_THEME) {
      const baseline = actualPower(core);
      const top3 = identityOrbs(theme)
        .filter((orb) => !CORE_UPGRADE_ALLOWLIST.has(orb.id))
        .map((orb) => marginalAp(core, orb))
        .sort((a, b) => b - a)
        .slice(0, 3);
      const built =
        baseline + top3.reduce((sum, marginal) => sum + marginal, 0);
      if (built < CORE_AP_BAND.min) {
        failures.push(
          `${theme}: fully-built AP ${built.toFixed(0)} below band min ${CORE_AP_BAND.min}`,
        );
      }
      if (built > CORE_AP_BAND.max) {
        failures.push(
          `${theme}: fully-built AP ${built.toFixed(0)} exceeds band max ${CORE_AP_BAND.max}`,
        );
      }
    }
    expect(failures).toEqual([]);
  });

  it("records the marginal AP of every identity orb (balance ledger)", () => {
    // Explicit price ledger — reviewed when the catalog or the AP model
    // changes. Regenerate by updating these numbers intentionally.
    const rows: string[] = [];
    for (const [theme, core] of CORES_BY_THEME) {
      const baseline = actualPower(core);
      rows.push(`${theme} (${core.id}) baseline ${baseline.toFixed(0)}`);
      for (const orb of identityOrbs(theme)) {
        rows.push(`  ${orb.id}: +${marginalAp(core, orb).toFixed(1)}`);
      }
    }
    expect(rows.join("\n")).toBe(
      [
        "regen (mana_crystal) baseline 67",
        "  mana_column_growth: +66.6",
        "  mana_reactive_charge: +7.9",
        "  mana_overflow_shield: +71.3",
        "  mana_regen_charge: +16.8",
        "damage (critical_crystal) baseline 67",
        "  crit_crit_column: +33.3",
        "  crit_row_power: +81.0",
        "  crit_crit_power: +20.4",
        "  crit_crit_slow: +15.3",
        "shield (protective_crystal) baseline 62",
        "  shield_ally_power: +55.6",
        "  shield_trigger_power: +46.8",
        "  shield_power: +50.9",
        "  shield_overflow: +71.3",
        "heal (growth_crystal) baseline 78",
        "  heal_growth_column: +38.5",
        "  heal_growth_trigger: +46.8",
        "  heal_overflow_power: +25.5",
        "  heal_power: +50.9",
        "poison (purple_crystal) baseline 85",
        "  poison_slow_enemy: +16.0",
        "  poison_slow_power: +50.9",
        "  poison_power: +50.9",
        "  poison_re_slow_drain: +25.5",
        "haste (quickstone) baseline 25",
        "  haste_regen: +92.3",
        "  haste_charge: +3.4",
        "  haste_rehaste_crit: +25.5",
        "  haste_rehaste_power: +25.5",
        "overflow (radiant_crystal) baseline 80",
        "  radiant_overflow_shield: +81.5",
        "  radiant_overflow_burst: +101.8",
        "  radiant_saturation: +50.9",
        "  radiant_overflow_charge: +16.8",
        "thorns (verdant_crystal) baseline 64",
        "  verdant_thorns: +108.0",
        "  verdant_thorn_shield: +86.4",
        "  verdant_retaliation: +27.0",
        "  verdant_vengeful_charge: +8.9",
        "void (void_crystal) baseline 60",
        "  void_leech: +172.8",
        "  void_power_drain: +120.0",
        "  void_dispel: +40.0",
        "  void_weakness: +76.4",
      ].join("\n"),
    );
  });
});
