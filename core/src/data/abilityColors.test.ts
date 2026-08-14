/// <reference types="jest" />

import { ABILITY_COLORS } from "./abilityColors";

describe("ABILITY_COLORS", () => {
  const expectedKeys = [
    "damage",
    "heal",
    "shield",
    "poison",
    "regen",
    "haste",
    "slow",
    "charge",
    "increase_power",
    "decrease_power",
    "on_crit",
    "on_battle_start",
    "on_over_heal",
    "any",
    "all",
  ];

  it("contains the expected ability keys", () => {
    for (const key of expectedKeys) {
      expect(ABILITY_COLORS).toHaveProperty(key);
    }
  });

  it("stores every color as a hex string starting with #", () => {
    for (const color of Object.values(ABILITY_COLORS)) {
      expect(color.startsWith("#")).toBe(true);
    }
  });
});
