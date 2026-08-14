/// <reference types="jest" />

import { ENCOUNTERS, ENCOUNTER_BY_ID } from "./encounters";

describe("encounters content", () => {
  it("has unique ids", () => {
    const ids = ENCOUNTERS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a non-empty pic, nameKey and descriptionKey for every entry", () => {
    for (const e of ENCOUNTERS) {
      expect(e.pic.length).toBeGreaterThan(0);
      expect(e.nameKey.length).toBeGreaterThan(0);
      expect(e.descriptionKey.length).toBeGreaterThan(0);
    }
  });

  it("keeps min/max round ranges sane", () => {
    for (const e of ENCOUNTERS) {
      if (e.minRound !== undefined) {
        expect(e.minRound).toBeGreaterThanOrEqual(1);
      }
      if (e.minRound !== undefined && e.maxRound !== undefined) {
        expect(e.minRound).toBeLessThanOrEqual(e.maxRound);
      }
    }
  });

  it("defines improve_ entries for each damage type with minRound 4", () => {
    for (const type of ["damage", "heal", "shield", "poison", "regen"]) {
      const entry = ENCOUNTER_BY_ID[`improve_${type}`];
      expect(entry).toBeDefined();
      expect(entry!.minRound).toBe(4);
      expect(entry!.params?.type).toBe(type);
    }
  });

  it("bounds the silver and gold shops to the expected rounds", () => {
    expect(ENCOUNTER_BY_ID["silver_shop"].minRound).toBe(1);
    expect(ENCOUNTER_BY_ID["silver_shop"].maxRound).toBe(5);
    expect(ENCOUNTER_BY_ID["gold_shop"].minRound).toBe(6);
    expect(ENCOUNTER_BY_ID["gold_shop"].maxRound).toBeUndefined();
  });

  it("exposes start_combat and upgrade_unit in the id index", () => {
    expect(ENCOUNTER_BY_ID["start_combat"]).toBeDefined();
    expect(ENCOUNTER_BY_ID["upgrade_unit"]).toBeDefined();
  });
});
