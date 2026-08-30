/// <reference types="jest" />

import { CORE_THEMES } from "../Models";
import {
  CORE_STAT_ORBS,
  CORE_UPGRADE_DEFINITIONS,
  getThemeUpgradePool,
} from "./coreUpgradeOrbs";

describe("core upgrade orbs content", () => {
  it("has unique ids and exactly 80 identity orbs", () => {
    const ids = Object.keys(CORE_UPGRADE_DEFINITIONS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(80);
  });

  it("keeps every entry themed by CORE_THEMES", () => {
    for (const orb of Object.values(CORE_UPGRADE_DEFINITIONS)) {
      expect(CORE_THEMES).toContain(orb.theme);
    }
  });

  it("keeps kinds pure: effect/reaction entries carry only their field", () => {
    for (const orb of Object.values(CORE_UPGRADE_DEFINITIONS)) {
      if (orb.kind === "effect") {
        expect(orb.effect).toBeDefined();
        expect(orb.reaction).toBeUndefined();
        expect(orb.stat).toBeUndefined();
      } else if (orb.kind === "reaction") {
        expect(orb.reaction).toBeDefined();
        expect(orb.effect).toBeUndefined();
        expect(orb.stat).toBeUndefined();
      } else {
        // identity orbs are never "stat" — stat orbs live in the pool accessor
        expect(false).toBe(true);
      }
    }
  });

  it("has Object.keys length equal to the number of registry entries", () => {
    expect(Object.keys(CORE_UPGRADE_DEFINITIONS).length).toBe(
      Object.values(CORE_UPGRADE_DEFINITIONS).length,
    );
  });

  it("builds each theme pool from its identity orbs + 3 stat orbs", () => {
    for (const theme of CORE_THEMES) {
      const pool = getThemeUpgradePool(theme);
      // All themes ship 9 identity orbs except haste — its 4th (Regen) moved
      // into quickstone's baseline (absolute basic-effect rule, see
      // docs/core-unit-onboarding.md §2 decision 4).
      const expectedIdentity = theme === "haste" ? 8 : 9;
      expect(pool).toHaveLength(expectedIdentity + 3);

      const identityOrbs = pool.filter((orb) => orb.kind !== "stat");
      const statOrbs = pool.filter((orb) => orb.kind === "stat");

      expect(identityOrbs).toHaveLength(expectedIdentity);
      for (const orb of identityOrbs) {
        expect(orb.theme).toBe(theme);
      }

      expect(statOrbs).toHaveLength(3);
      for (const orb of statOrbs) {
        expect(orb.kind).toBe("stat");
        expect(orb.theme).toBe(theme);
        expect(CORE_STAT_ORBS).toContain(orb.stat);
      }
    }
  });

  it("places the three stat orbs after the identity orbs, in order", () => {
    for (const theme of CORE_THEMES) {
      const pool = getThemeUpgradePool(theme);
      const identityCount = theme === "haste" ? 8 : 9;
      const kinds = pool.map((orb) => orb.kind);
      expect(
        kinds.slice(0, identityCount).every((kind) => kind !== "stat"),
      ).toBe(true);
      expect(kinds.slice(identityCount)).toEqual(["stat", "stat", "stat"]);
      expect(pool.slice(identityCount).map((orb) => orb.id)).toEqual([
        ...CORE_STAT_ORBS,
      ]);
    }
  });
});
