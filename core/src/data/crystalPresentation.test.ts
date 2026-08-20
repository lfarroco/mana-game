/// <reference types="jest" />

import { getColorPresetForCrystal } from "./crystalPresentation";

describe("getColorPresetForCrystal", () => {
  it("maps every crystal to a valid preset", () => {
    const crystals = [
      "mana_crystal",
      "critical_crystal",
      "protective_crystal",
      "growth_crystal",
      "purple_crystal",
      "quickstone",
      "radiant_crystal",
      "verdant_crystal",
      "void_crystal",
    ];

    for (const crystalId of crystals) {
      expect(getColorPresetForCrystal(crystalId)).toBeDefined();
    }
  });

  it("falls back to nebula for unknown ids", () => {
    expect(getColorPresetForCrystal("unknown_crystal")).toBe("nebula");
  });
});
