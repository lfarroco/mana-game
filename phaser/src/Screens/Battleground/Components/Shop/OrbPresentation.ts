/**
 * Orb Presentation Layer
 *
 * Maps orb IDs → UI presentation data (name, tooltip, color, icon).
 * Reads from the pure orb data registry in core; no dummy RNG, no
 * effect instantiation.
 */

import * as i18n from "@i18n/i18n";

export type OrbPresentation = {
  id: string;
  name: string;
  color: number;
  tooltip: string;
  icon: string;
};

// ---------------------------------------------------------------------------
// Look-up data (not exported)
// ---------------------------------------------------------------------------

const typeLabels: Record<string, string> = {
  damage: "damage", heal: "heal", shield: "shield",
  poison: "poison", regen: "regen", haste: "haste",
  slow: "slow", charge: "charge",
};

const orbIconMap: Record<string, string> = {
  increase_power: "ui/commander",
  decrease_cooldown: "ui/trial_circuit",
  increase_critical: "ui/assassin",
  upgrade_orb: "ui/upgrade_unit",
  increase_core_max_life: "ui/improve_heal",
  upgrade_core_power: "ui/upgrade_unit",
  decrease_core_cooldown: "ui/trial_circuit",
  distribute_power: "ui/power_distributor",
  absorb_power: "ui/power_absorber",
  dark_ritual: "ui/dark_ritual",
  reaction: "ui/forest_pools",
};

// ---------------------------------------------------------------------------
// Orb presentation registry
// ---------------------------------------------------------------------------

const ORB_PRESENTATIONS: Record<string, OrbPresentation> = {};

export function getOrbPresentation(orbId: string): OrbPresentation {
  const spec = ORB_PRESENTATIONS[orbId];
  if (spec) return spec;
  return { id: orbId, name: orbId, color: 0x888888, tooltip: orbId, icon: "ui/upgrade_unit" };
}

// ---------------------------------------------------------------------------
// Registration helpers
// ---------------------------------------------------------------------------

function statOrbs(prefix: string, labelKey: string, color: number, icon: string): void {
  for (const [type] of Object.entries(typeLabels)) {
    const id = `${prefix}_on_${type}`;
    ORB_PRESENTATIONS[id] = {
      id,
      name: i18n.t(`shop.orbs.${labelKey}.name`, { type }),
      color,
      tooltip: i18n.t(`shop.orbs.${labelKey}.tooltip`, { type }),
      icon,
    };
  }
}

function reactionCard(id: string, nameKey: string): void {
  ORB_PRESENTATIONS[id] = {
    id,
    name: i18n.t(`tooltip.effects.${nameKey}`),
    color: 0x3399ff,
    tooltip: i18n.t(`tooltip.effects.${nameKey}`),
    icon: orbIconMap.reaction,
  };
}


// ---------------------------------------------------------------------------
// Register all orb presentations (called at module scope)
// ---------------------------------------------------------------------------

// --- Stat orbs ---
statOrbs("increase_power", "increasePower", 0xff3333, orbIconMap.increase_power);
statOrbs("decrease_cooldown", "decreaseCooldown", 0xff3333, orbIconMap.decrease_cooldown);
statOrbs("increase_critical", "increaseCritical", 0xff3333, orbIconMap.increase_critical);

// --- Special orbs ---
ORB_PRESENTATIONS["upgrade_orb"] = {
  id: "upgrade_orb",
  name: i18n.t("shop.orbs.upgrade.name"),
  color: 0x3399ff,
  tooltip: i18n.t("shop.orbs.upgrade.tooltip"),
  icon: orbIconMap.upgrade_orb,
};
ORB_PRESENTATIONS["increase_core_max_life"] = {
  id: "increase_core_max_life",
  name: i18n.t("shop.orbs.increaseMaxLife.name"),
  color: 0x32cd32,
  tooltip: i18n.t("shop.orbs.increaseMaxLife.tooltip", { amount: "?" }),
  icon: orbIconMap.increase_core_max_life,
};
ORB_PRESENTATIONS["upgrade_core_power"] = {
  id: "upgrade_core_power",
  name: i18n.t("shop.orbs.upgradePower.name"),
  color: 0xee4b2b,
  tooltip: i18n.t("shop.orbs.upgradePower.tooltip", { amount: "?" }),
  icon: orbIconMap.upgrade_core_power,
};
ORB_PRESENTATIONS["decrease_core_cooldown"] = {
  id: "decrease_core_cooldown",
  name: i18n.t("shop.orbs.decreaseCoreCooldown.name"),
  color: 0x00eaff,
  tooltip: i18n.t("shop.orbs.decreaseCoreCooldown.tooltip"),
  icon: orbIconMap.decrease_core_cooldown,
};
ORB_PRESENTATIONS["distribute_power_orb"] = {
  id: "distribute_power_orb",
  name: i18n.t("shop.orbs.distributePower.name"),
  color: 0xffaa00,
  tooltip: i18n.t("shop.orbs.distributePower.tooltip"),
  icon: orbIconMap.distribute_power,
};
ORB_PRESENTATIONS["absorb_power_orb"] = {
  id: "absorb_power_orb",
  name: i18n.t("shop.orbs.absorbPower.name"),
  color: 0xaa00ff,
  tooltip: i18n.t("shop.orbs.absorbPower.tooltip"),
  icon: orbIconMap.absorb_power,
};
ORB_PRESENTATIONS["sacrifice_effect_orb"] = {
  id: "sacrifice_effect_orb",
  name: i18n.t("shop.orbs.darkRitual.name"),
  color: 0x550000,
  tooltip: i18n.t("shop.orbs.darkRitual.tooltip"),
  icon: orbIconMap.dark_ritual,
};

// --- Reaction cards ---
reactionCard("on_100_damage_effect", "every_100_damage");
reactionCard("on_100_shield_effect", "every_100_shield");
reactionCard("on_100_heal_effect", "every_100_heal");
reactionCard("on_10_regen_effect", "every_10_regen");
reactionCard("on_10_poison_effect", "every_10_poison");
reactionCard("on_re_slow_effect", "re_slow");
reactionCard("on_re_haste_effect", "re_hasted");
reactionCard("on_over_heal_effect", "on_over_heal");
reactionCard("on_crit_effect", "on_crit");
reactionCard("on_battle_start_effect", "on_battle_start");
