import { MIN_ROUND_FOR_GOLD_SHOP, MIN_ROUND_FOR_SILVER_SHOP } from "../math/Constants";

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
  {
    id: "start_combat",
    pic: "ui/armory",
    nameKey: "encounters.combat.name",
    descriptionKey: "encounters.combat.desc",
  },
];

export const ENCOUNTER_BY_ID: Record<string, EncounterData> = Object.fromEntries(
  ENCOUNTERS.map((e) => [e.id, e]),
);
