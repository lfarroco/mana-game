import {
  MIN_ROUND_FOR_GOLD_SHOP,
  MIN_ROUND_FOR_SILVER_SHOP,
} from "../math/Constants";

/** Encounter catalog data — i18n keys, resolved by the client at render time. */
export type EncounterData = {
  id: string;
  pic: string;
  nameKey: string;
  descriptionKey: string;
  params?: Record<string, string>;
  minRound?: number;
  maxRound?: number;
};

const improveType = (pic: string, type: string): EncounterData => ({
  id: `improve_${type}`,
  pic,
  nameKey: "encounters.improve_type.name",
  descriptionKey: "encounters.improve_type.desc",
  params: { type },
  minRound: 4,
});

export const ENCOUNTERS: EncounterData[] = [
  {
    id: "upgrade_unit",
    pic: "ui/upgrade_unit",
    nameKey: "encounters.upgrade_unit.name",
    descriptionKey: "encounters.upgrade_unit.desc",
  },
  improveType("ui/improve_damage", "damage"),
  improveType("ui/improve_heal", "heal"),
  improveType("ui/improve_shield", "shield"),
  improveType("ui/toxic", "poison"),
  improveType("ui/improve_regen", "regen"),
  {
    id: "armory",
    pic: "ui/armory",
    nameKey: "encounters.armory.name",
    descriptionKey: "encounters.armory.desc",
  },
  {
    id: "healing_tent",
    pic: "ui/improve_heal",
    nameKey: "encounters.healing_tent.name",
    descriptionKey: "encounters.healing_tent.desc",
  },
  {
    id: "frontier_fort",
    pic: "ui/frontier_fort",
    nameKey: "encounters.frontier_fort.name",
    descriptionKey: "encounters.frontier_fort.desc",
  },
  {
    id: "forest_pools",
    pic: "ui/forest_pools",
    nameKey: "encounters.forest_pools.name",
    descriptionKey: "encounters.forest_pools.desc",
  },
  {
    id: "toxic_chamber",
    pic: "ui/toxic",
    nameKey: "encounters.toxic_chamber.name",
    descriptionKey: "encounters.toxic_chamber.desc",
  },
  {
    id: "trial_circuit",
    pic: "ui/trial_circuit",
    nameKey: "encounters.trial_circuit.name",
    descriptionKey: "encounters.trial_circuit.desc",
  },
  {
    id: "trappers_guild",
    pic: "ui/improve_slow",
    nameKey: "encounters.trappers_guild.name",
    descriptionKey: "encounters.trappers_guild.desc",
  },
  {
    id: "thunder_spire",
    pic: "ui/thunder_spire",
    nameKey: "encounters.thunder_spire.name",
    descriptionKey: "encounters.thunder_spire.desc",
  },
  {
    id: "commanders_tent",
    pic: "ui/commander",
    nameKey: "encounters.commanders_tent.name",
    descriptionKey: "encounters.commanders_tent.desc",
  },
  {
    id: "assassins_hideout",
    pic: "ui/assassin",
    nameKey: "encounters.assassins_hideout.name",
    descriptionKey: "encounters.assassins_hideout.desc",
  },
  {
    id: "power_distributor",
    pic: "ui/power_distributor",
    nameKey: "encounters.power_distributor.name",
    descriptionKey: "encounters.power_distributor.desc",
    minRound: 3,
  },
  {
    id: "power_absorber",
    pic: "ui/power_absorber",
    nameKey: "encounters.power_absorber.name",
    descriptionKey: "encounters.power_absorber.desc",
    minRound: 3,
  },
  {
    id: "silver_shop",
    pic: "ui/silver_medal",
    nameKey: "encounters.silver_shop",
    descriptionKey: "encounters.silver_shop_desc",
    minRound: MIN_ROUND_FOR_SILVER_SHOP,
    maxRound: MIN_ROUND_FOR_GOLD_SHOP - 1,
  },
  {
    id: "gold_shop",
    pic: "ui/gold_medal",
    nameKey: "encounters.gold_shop",
    descriptionKey: "encounters.gold_shop_desc",
    minRound: MIN_ROUND_FOR_GOLD_SHOP,
  },
  // ── New encounter types (2026-08-18, P1 slice) ──────────────────────────
  {
    id: "gamblers_shrine",
    pic: "ui/dark_ritual",
    nameKey: "encounters.gamblers_shrine.name",
    descriptionKey: "encounters.gamblers_shrine.desc",
    minRound: 2,
  },
  {
    id: "dark_ritual",
    pic: "ui/sacrifice",
    nameKey: "encounters.dark_ritual.name",
    descriptionKey: "encounters.dark_ritual.desc",
    minRound: 3,
  },
  {
    id: "scrap_salvage",
    pic: "ui/sacrifice",
    nameKey: "encounters.scrap_salvage.name",
    descriptionKey: "encounters.scrap_salvage.desc",
    minRound: 2,
  },
  {
    id: "rest_inn",
    pic: "ui/improve_heal",
    nameKey: "encounters.rest_inn.name",
    descriptionKey: "encounters.rest_inn.desc",
    minRound: 2,
    maxRound: 6,
  },
  {
    id: "soul_trade",
    pic: "ui/gold_medal",
    nameKey: "encounters.soul_trade.name",
    descriptionKey: "encounters.soul_trade.desc",
    minRound: 4,
  },
  {
    id: "runesmith_damage",
    pic: "ui/improve_damage",
    nameKey: "encounters.runesmith_damage.name",
    descriptionKey: "encounters.runesmith_damage.desc",
    minRound: 3,
  },
  {
    id: "runesmith_shield",
    pic: "ui/improve_shield",
    nameKey: "encounters.runesmith_shield.name",
    descriptionKey: "encounters.runesmith_shield.desc",
    minRound: 3,
  },
  {
    id: "runesmith_heal",
    pic: "ui/improve_heal",
    nameKey: "encounters.runesmith_heal.name",
    descriptionKey: "encounters.runesmith_heal.desc",
    minRound: 3,
  },
  // ── Wacky content slice (2026-08-19, Tier A encounters) ──────────────
  {
    id: "oracles_riddle",
    pic: "ui/trial_circuit",
    nameKey: "encounters.oracles_riddle.name",
    descriptionKey: "encounters.oracles_riddle.desc",
    minRound: 2,
  },
  {
    id: "chaos_altar",
    pic: "ui/dark_ritual",
    nameKey: "encounters.chaos_altar.name",
    descriptionKey: "encounters.chaos_altar.desc",
    minRound: 2,
  },
  {
    id: "roulette_wheel",
    pic: "ui/gold_medal",
    nameKey: "encounters.roulette_wheel.name",
    descriptionKey: "encounters.roulette_wheel.desc",
    minRound: 2,
  },
  {
    id: "lucky_pig",
    pic: "ui/gold_medal",
    nameKey: "encounters.lucky_pig.name",
    descriptionKey: "encounters.lucky_pig.desc",
    minRound: 2,
  },
  {
    id: "start_combat",
    pic: "ui/armory",
    nameKey: "encounters.combat.name",
    descriptionKey: "encounters.combat.desc",
  },
];

export const ENCOUNTER_BY_ID: Record<string, EncounterData> =
  Object.fromEntries(ENCOUNTERS.map((e) => [e.id, e]));
