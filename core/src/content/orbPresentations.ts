/** Orb presentation data — i18n keys, resolved by the client at render time. */
import { CORE_UPGRADE_DEFINITIONS } from "./coreUpgradeOrbs";

export type OrbPresentationData = {
  id: string;
  color: number;
  icon: string;
  nameKey: string;
  tooltipKey: string;
  params?: Record<string, string>;
};

const ORB_ICONS: Record<string, string> = {
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

const STAT_ORB_TYPES = [
  "damage",
  "heal",
  "shield",
  "poison",
  "regen",
  "haste",
  "slow",
  "charge",
] as const;

const statOrbs = (
  prefix: string,
  labelKey: string,
  color: number,
  icon: string,
): OrbPresentationData[] =>
  STAT_ORB_TYPES.map((type) => ({
    id: `${prefix}_on_${type}`,
    color,
    icon,
    nameKey: `shop.orbs.${labelKey}.name`,
    tooltipKey: `shop.orbs.${labelKey}.tooltip`,
    params: { type },
  }));

const reactionCard = (id: string, nameKey: string): OrbPresentationData => ({
  id,
  color: 0x3399ff,
  icon: ORB_ICONS.reaction,
  nameKey: `tooltip.effects.${nameKey}`,
  tooltipKey: `tooltip.effects.${nameKey}`,
});

const buildOrbPresentationData = (): OrbPresentationData[] => [
  ...statOrbs(
    "increase_power",
    "increasePower",
    0xff3333,
    ORB_ICONS.increase_power,
  ),
  ...statOrbs(
    "decrease_cooldown",
    "decreaseCooldown",
    0xff3333,
    ORB_ICONS.decrease_cooldown,
  ),
  ...statOrbs(
    "increase_critical",
    "increaseCritical",
    0xff3333,
    ORB_ICONS.increase_critical,
  ),
  {
    id: "upgrade_orb",
    color: 0x3399ff,
    icon: ORB_ICONS.upgrade_orb,
    nameKey: "shop.orbs.upgrade.name",
    tooltipKey: "shop.orbs.upgrade.tooltip",
  },
  {
    id: "increase_core_max_life",
    color: 0x32cd32,
    icon: ORB_ICONS.increase_core_max_life,
    nameKey: "shop.orbs.increaseMaxLife.name",
    tooltipKey: "shop.orbs.increaseMaxLife.tooltip",
    params: { amount: "?" },
  },
  {
    id: "upgrade_core_power",
    color: 0xee4b2b,
    icon: ORB_ICONS.upgrade_core_power,
    nameKey: "shop.orbs.upgradePower.name",
    tooltipKey: "shop.orbs.upgradePower.tooltip",
    params: { amount: "?" },
  },
  {
    id: "decrease_core_cooldown",
    color: 0x00eaff,
    icon: ORB_ICONS.decrease_core_cooldown,
    nameKey: "shop.orbs.decreaseCoreCooldown.name",
    tooltipKey: "shop.orbs.decreaseCoreCooldown.tooltip",
  },
  {
    id: "distribute_power_orb",
    color: 0xffaa00,
    icon: ORB_ICONS.distribute_power,
    nameKey: "shop.orbs.distributePower.name",
    tooltipKey: "shop.orbs.distributePower.tooltip",
  },
  {
    id: "absorb_power_orb",
    color: 0xaa00ff,
    icon: ORB_ICONS.absorb_power,
    nameKey: "shop.orbs.absorbPower.name",
    tooltipKey: "shop.orbs.absorbPower.tooltip",
  },
  {
    id: "sacrifice_effect_orb",
    color: 0x550000,
    icon: ORB_ICONS.dark_ritual,
    nameKey: "shop.orbs.darkRitual.name",
    tooltipKey: "shop.orbs.darkRitual.tooltip",
  },
  {
    id: "sacrifice_unit_orb",
    color: 0x550000,
    icon: ORB_ICONS.dark_ritual,
    nameKey: "shop.orbs.sacrificeUnit.name",
    tooltipKey: "shop.orbs.sacrificeUnit.tooltip",
  },
  {
    id: "scrap_salvage_orb",
    color: 0x7a2e00,
    icon: ORB_ICONS.dark_ritual,
    nameKey: "shop.orbs.scrapSalvage.name",
    tooltipKey: "shop.orbs.scrapSalvage.tooltip",
  },
  {
    id: "chaos_altar_random_orb",
    color: 0x9932cc,
    icon: ORB_ICONS.dark_ritual,
    nameKey: "shop.orbs.chaosAltar.name",
    tooltipKey: "shop.orbs.chaosAltar.tooltip",
  },
  // ── Core-upgrade identity orbs (CUB-E1/E2): the themed upgrade_core /
  // add_reaction_core options render through these presentations. ─────
  ...buildCoreUpgradeOrbPresentations(),
  reactionCard("on_100_damage_effect", "every_100_damage"),
  reactionCard("on_100_shield_effect", "every_100_shield"),
  reactionCard("on_100_heal_effect", "every_100_heal"),
  reactionCard("on_10_regen_effect", "every_10_regen"),
  reactionCard("on_10_poison_effect", "every_10_poison"),
  reactionCard("on_re_slow_effect", "re_slow"),
  reactionCard("on_re_haste_effect", "re_hasted"),
  reactionCard("on_over_heal_effect", "on_over_heal"),
  reactionCard("on_crit_effect", "on_crit"),
  reactionCard("on_battle_start_effect", "on_battle_start"),
];

/**
 * CUB-E1/E2 (docs/core-unit-onboarding.md §5): presentations for the 62 themed
 * core-upgrade identity orbs so the upgrade_core / add_reaction_core phases
 * render readable names + descriptions instead of raw option ids.
 *
 * Each entry's icon/color follows its theme's family; the name/tooltip i18n
 * keys live under shop.orbs.coreUpgrade.<id>.{name,tooltip}.
 */
const CORE_UPGRADE_THEME_ICONS: Record<string, string> = {
  regen: "ui/improve_regen",
  damage: "ui/improve_damage",
  shield: "ui/improve_shield",
  heal: "ui/improve_heal",
  poison: "ui/toxic",
  haste: "ui/improve_haste",
  overflow: "ui/improve_heal",
  thorns: "ui/improve_shield",
  void: "ui/power_absorber",
};

const CORE_UPGRADE_THEME_COLORS: Record<string, number> = {
  regen: 0x257331,
  damage: 0xf21414,
  shield: 0xfff308,
  heal: 0x07f62f,
  poison: 0xc41bf3,
  haste: 0x91a7ff,
  overflow: 0xfff3b0,
  thorns: 0x33691a,
  void: 0x6741d9,
};

const buildCoreUpgradeOrbPresentations = (): OrbPresentationData[] =>
  Object.keys(CORE_UPGRADE_DEFINITIONS).map((id) => {
    const theme = CORE_UPGRADE_DEFINITIONS[id].theme;
    return {
      id,
      color: CORE_UPGRADE_THEME_COLORS[theme] ?? 0x888888,
      icon: CORE_UPGRADE_THEME_ICONS[theme] ?? "ui/upgrade_unit",
      nameKey: `shop.orbs.coreUpgrade.${id}.name`,
      tooltipKey: `shop.orbs.coreUpgrade.${id}.tooltip`,
    };
  });

export const ORB_PRESENTATION_DATA: Record<string, OrbPresentationData> =
  Object.fromEntries(buildOrbPresentationData().map((o) => [o.id, o]));

export const getOrbPresentationData = (
  orbId: string,
): OrbPresentationData | null => ORB_PRESENTATION_DATA[orbId] ?? null;
