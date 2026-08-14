/// <reference types="jest" />

import type { CardDefinition } from "../Models";
import { buildCrystalDescription } from "./crystalDescription";
import type { Translate } from "./descriptions";

const fakeT: Translate = (key, params) => {
  const table: Record<string, string> = {
    "tooltip.sentence.damage": "{amount} damage to {target}",
    "tooltip.sentence.haste": "Haste {duration}s on {target}",
    "tooltip.sentence.increase_power": "+{amount} power to {target}",
    "tooltip.targets.default": "targets",
    "tooltip.effects.damage": "Damage",
    "tooltip.effects.haste": "Haste",
    "tooltip.effects.increase_power": "Power",
    "tooltip.sentence.trigger.default": "{effect} on {source}",
    "tooltip.sentence.reaction": "{trigger} => {effect}",
    "tooltip.sentence.position.any": "any",
    "tooltip.sentence.position.ally": "allies",
    "description.cooldown": "CD",
    "description.crit": "Crit",
    "description.noAbilities": "No abilities",
    "rank.bronze": "Bronze",
    "rank.silver": "Silver",
    "rank.gold": "Gold",
    "rank.platinum": "Platinum",
    "card.test_crystal.name": "Test Crystal",
    "crystalSelection.cooldown": "CD",
    "crystalSelection.life": "Life",
    "crystalSelection.noAbilities": "No abilities",
    "tooltip.sentence.target.all_allies_type": "all {type}",
  };
  let s = table[key] ?? key;
  if (params)
    for (const [k, v] of Object.entries(params))
      s = s.replace(new RegExp(`{${k}}`, "g"), String(v));
  return s;
};

describe("buildCrystalDescription", () => {
  it("renders the stats block, life block, and effect lines", () => {
    const crystal: CardDefinition = {
      id: "test_crystal",
      pic: "test_crystal_pic",
      power: 10,
      cooldown: 2000,
      life: 50,
      effects: [{ id: "damage" }],
      reactions: [],
    };
    const result = buildCrystalDescription(crystal, fakeT, false);
    expect(result).toContain("2.0s");
    expect(result).toContain("Life");
    expect(result).toContain("50");
    expect(result).toContain("- 10 damage to");
  });

  it("falls back to the no-abilities text for empty crystals", () => {
    const crystal: CardDefinition = {
      id: "test_crystal",
      pic: "test_crystal_pic",
      power: 10,
      cooldown: 2000,
      effects: [],
      reactions: [],
    };
    const result = buildCrystalDescription(crystal, fakeT, false);
    expect(result).toContain("No abilities");
  });
});
