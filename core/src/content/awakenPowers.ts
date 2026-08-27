/**
 * Awaken Powers — the reaction catalog for the "awaken" mechanic.
 *
 * When a bronze-origin unit (a card whose base rank is 1) is promoted to gold
 * (rank 3), the run routes into the `awaken` phase and the player picks one of
 * three randomly-offered reactions from this catalog. The chosen reaction is
 * appended permanently to the unit.
 *
 * Pure data registry (no factories, no RNG) — mirrors `coreUpgradeOrbs.ts`.
 * Presentation data (icon/color/i18n keys) lives alongside so the client can
 * render readable cards without a second lookup table.
 *
 * Balance lens (docs/unit-balance.md): these are FREE bonuses stacked on an
 * already-×3-scaled rank-3 unit, so magnitudes are modest — small flat power
 * grants, single-target buffs, or defensive procs. Avoid the §17 broad-charge
 * anti-pattern (the one charge power keys off a specific directional ally).
 */

import { EffectReaction, GLOBAL_REACTIONS } from "../Models";
import {
  charge,
  damage,
  haste,
  heal,
  increaseCritical,
  increasePower,
  reaction,
  self,
  shield,
  trigger,
} from "../data/effectBuilders";
import { increasePowerOnWeakest } from "../Orbs/OrbDefinitions";

export type AwakenPower = {
  id: string;
  reaction: EffectReaction;
  /** Texture key for the encounter card icon. */
  icon: string;
  /** Accent color for the card. */
  color: number;
  nameKey: string;
  tooltipKey: string;
};

export const AWAKEN_POWERS = {
  // ── Team engines ──────────────────────────────────────────────────────
  battle_trance: {
    id: "battle_trance",
    reaction: reaction("damage", "allies", increasePower(3, trigger)),
    icon: "ui/improve_damage",
    color: 0xff4444,
    nameKey: "awakenPowers.battle_trance.name",
    tooltipKey: "awakenPowers.battle_trance.tooltip",
  },
  guardian_aura: {
    id: "guardian_aura",
    reaction: reaction("heal", "allies", shield),
    icon: "ui/improve_heal",
    color: 0x44ff44,
    nameKey: "awakenPowers.guardian_aura.name",
    tooltipKey: "awakenPowers.guardian_aura.tooltip",
  },
  blessed_mending: {
    id: "blessed_mending",
    reaction: reaction("shield", "allies", heal),
    icon: "ui/improve_shield",
    color: 0xffdd44,
    nameKey: "awakenPowers.blessed_mending.name",
    tooltipKey: "awakenPowers.blessed_mending.tooltip",
  },
  critical_focus: {
    id: "critical_focus",
    reaction: reaction("on_crit", "allies", increaseCritical(5, self)),
    icon: "ui/assassin",
    color: 0xffcc00,
    nameKey: "awakenPowers.critical_focus.name",
    tooltipKey: "awakenPowers.critical_focus.tooltip",
  },
  power_surge: {
    id: "power_surge",
    reaction: reaction("every_100_damage", "allies", increasePowerOnWeakest),
    icon: "ui/power_distributor",
    color: 0xff8800,
    nameKey: "awakenPowers.power_surge.name",
    tooltipKey: "awakenPowers.power_surge.tooltip",
  },
  battle_rush: {
    id: "battle_rush",
    reaction: reaction("on_battle_start", "allies", haste(1200, self)),
    icon: "ui/trial_circuit",
    color: 0x00eaff,
    nameKey: "awakenPowers.battle_rush.name",
    tooltipKey: "awakenPowers.battle_rush.tooltip",
  },
  overcharge: {
    id: "overcharge",
    reaction: reaction("damage", "left_ally", charge(200, self)),
    icon: "ui/upgrade_unit",
    color: 0x3399ff,
    nameKey: "awakenPowers.overcharge.name",
    tooltipKey: "awakenPowers.overcharge.tooltip",
  },

  // ── Cross-force counters ─────────────────────────────────────────────
  bloodthirst: {
    id: "bloodthirst",
    reaction: reaction("damage", "enemies", increasePower(4, self), "enemy"),
    icon: "ui/improve_damage",
    color: 0xbb2222,
    nameKey: "awakenPowers.bloodthirst.name",
    tooltipKey: "awakenPowers.bloodthirst.tooltip",
  },
  vengeance: {
    id: "vengeance",
    reaction: reaction("heal", "enemies", damage, "enemy"),
    icon: "ui/improve_heal",
    color: 0xaa44ff,
    nameKey: "awakenPowers.vengeance.name",
    tooltipKey: "awakenPowers.vengeance.tooltip",
  },
  venomous: {
    id: "venomous",
    reaction: reaction("poison", "enemies", increasePower(3, self), "enemy"),
    icon: "ui/toxic",
    color: 0x55dd55,
    nameKey: "awakenPowers.venomous.name",
    tooltipKey: "awakenPowers.venomous.tooltip",
  },
  tenacity: {
    id: "tenacity",
    reaction: reaction("slow", "enemies", increasePower(3, self), "enemy"),
    icon: "ui/frontier_fort",
    color: 0x88aacc,
    nameKey: "awakenPowers.tenacity.name",
    tooltipKey: "awakenPowers.tenacity.tooltip",
  },

  // ── Defense ──────────────────────────────────────────────────────────
  crystal_vigor: {
    id: "crystal_vigor",
    reaction: reaction("on_crystal_hit", "enemies", heal, "enemy"),
    icon: "ui/improve_heal",
    color: 0x00cccc,
    nameKey: "awakenPowers.crystal_vigor.name",
    tooltipKey: "awakenPowers.crystal_vigor.tooltip",
  },
} satisfies Record<string, AwakenPower>;

export type AwakenPowerId = keyof typeof AWAKEN_POWERS;

export const AWAKEN_POWER_LIST: AwakenPower[] = Object.values(AWAKEN_POWERS);

/**
 * Structural validation for an awaken power (mirrors `validateCardDefinition`
 * plus the balance test's `"enemies"` triggerTeam rule). Returns a list of
 * design issues (empty = valid).
 */
export function validateAwakenPower(power: AwakenPower): string[] {
  const issues: string[] = [];
  const r = power.reaction;

  if (r.position === "self" && !GLOBAL_REACTIONS.includes(r.effectId)) {
    issues.push(
      `Awaken power "${power.id}": reaction with position "self" and effectId "${r.effectId}" can never fire ` +
        `(the triggering unit is excluded from reaction candidates unless the effect is a global reaction).`,
    );
  }

  if (r.position === "enemies" && r.triggerTeam !== "enemy") {
    issues.push(
      `Awaken power "${power.id}": "enemies" reaction must set triggerTeam: "enemy"`,
    );
  }

  if (r.position !== "enemies" && r.triggerTeam !== undefined) {
    issues.push(
      `Awaken power "${power.id}": triggerTeam is only meaningful on "enemies" reactions`,
    );
  }

  if (r.effects.length === 0) {
    issues.push(
      `Awaken power "${power.id}": reaction must have at least one effect`,
    );
  }

  return issues;
}
