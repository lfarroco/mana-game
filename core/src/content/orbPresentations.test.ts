/// <reference types="jest" />

import {
  ORB_PRESENTATION_DATA,
  getOrbPresentationData,
} from "./orbPresentations";
import { CORE_UPGRADE_DEFINITIONS } from "./coreUpgradeOrbs";

const STAT_PREFIXES = [
  "increase_power",
  "decrease_cooldown",
  "increase_critical",
] as const;
const STAT_TYPES = [
  "damage",
  "heal",
  "shield",
  "poison",
  "regen",
  "haste",
  "slow",
  "charge",
] as const;

describe("orb presentations content", () => {
  it("has unique ids", () => {
    const ids = Object.keys(ORB_PRESENTATION_DATA);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a color, icon, nameKey and tooltipKey for every entry", () => {
    for (const orb of Object.values(ORB_PRESENTATION_DATA)) {
      expect(orb.color).toBeDefined();
      expect(orb.icon.length).toBeGreaterThan(0);
      expect(orb.nameKey.length).toBeGreaterThan(0);
      expect(orb.tooltipKey.length).toBeGreaterThan(0);
    }
  });

  it("defines stat orbs for every type under each stat prefix", () => {
    expect(ORB_PRESENTATION_DATA["increase_power_on_damage"]).toBeDefined();
    expect(ORB_PRESENTATION_DATA["increase_power_on_heal"]).toBeDefined();
    expect(ORB_PRESENTATION_DATA["decrease_cooldown_on_damage"]).toBeDefined();
    expect(ORB_PRESENTATION_DATA["increase_critical_on_damage"]).toBeDefined();

    const generated = STAT_PREFIXES.flatMap((prefix) =>
      STAT_TYPES.map((type) => `${prefix}_on_${type}`),
    );
    expect(generated).toHaveLength(24);
    for (const id of generated) {
      expect(ORB_PRESENTATION_DATA[id]).toBeDefined();
    }
  });

  it("defines the orbs used by the shop flow", () => {
    for (const id of [
      "distribute_power_orb",
      "absorb_power_orb",
      "sacrifice_effect_orb",
      "upgrade_orb",
      "increase_core_max_life",
      "upgrade_core_power",
      "decrease_core_cooldown",
    ]) {
      expect(ORB_PRESENTATION_DATA[id]).toBeDefined();
    }
  });

  it("defines reaction orbs with the reaction icon", () => {
    for (const id of [
      "on_100_damage_effect",
      "on_10_poison_effect",
      "on_crit_effect",
      "on_battle_start_effect",
    ]) {
      const orb = ORB_PRESENTATION_DATA[id];
      expect(orb).toBeDefined();
      expect(orb!.icon).toBe("ui/forest_pools");
    }
  });

  it("returns null for unknown orb ids", () => {
    expect(getOrbPresentationData("missing")).toBeNull();
  });

  it("defines a themed presentation for every core-upgrade identity orb (CUB-E1)", () => {
    const ids = Object.keys(CORE_UPGRADE_DEFINITIONS);
    expect(ids).toHaveLength(28);
    for (const id of ids) {
      const orb = ORB_PRESENTATION_DATA[id];
      expect(orb).toBeDefined();
      expect(orb!.nameKey).toBe(`shop.orbs.coreUpgrade.${id}.name`);
      expect(orb!.tooltipKey).toBe(`shop.orbs.coreUpgrade.${id}.tooltip`);
      expect(orb!.icon.length).toBeGreaterThan(0);
    }
  });
});
