/// <reference types="jest" />

import * as Card from "../Entities/Card";
import type { CardDefinition } from "../Models";
import { FORCE_ID_PLAYER } from "../math/Constants";
import { buildUnitDescription } from "./unitDescription";
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

const testCrystalCard: CardDefinition = {
  id: "test_crystal",
  pic: "test_crystal_pic",
  power: 10,
  cooldown: 2000,
  rank: 1,
  effects: [],
  reactions: [],
};

describe("buildUnitDescription", () => {
  beforeEach(() => {
    Card.setCardsMap(new Map([["test_crystal", testCrystalCard]]));
  });

  afterEach(() => {
    Card.resetCardsMap();
  });

  const makeUnit = () => {
    const unit = Card.makeUnit(FORCE_ID_PLAYER, "test_crystal", [1, 1]);
    unit.rank = 2;
    unit.power = 10;
    return unit;
  };

  it("builds a title with the card name and rank", () => {
    const { title } = buildUnitDescription(makeUnit(), fakeT, false);
    expect(title).toBe("Test Crystal (Silver)");
  });

  it("names ranks past platinum with a platinum level", () => {
    const unit = makeUnit();
    unit.rank = 5;
    expect(buildUnitDescription(unit, fakeT, false).title).toBe(
      "Test Crystal (Platinum 1)",
    );
    unit.rank = 7;
    expect(buildUnitDescription(unit, fakeT, false).title).toBe(
      "Test Crystal (Platinum 3)",
    );
  });

  it("includes the cooldown seconds and the no-abilities fallback", () => {
    const { description } = buildUnitDescription(makeUnit(), fakeT, false);
    expect(description).toContain("2.0s");
    expect(description).toContain("No abilities");
  });

  it("includes the damage sentence when an effect is attached", () => {
    const unit = makeUnit();
    unit.effects = [{ id: "damage" }];
    const { description } = buildUnitDescription(unit, fakeT, false);
    expect(description).toContain("10 damage to");
  });
});
