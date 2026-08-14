/// <reference types="jest" />

import type { RunStats } from "../types/session";
import {
  checkMostPowerfulUnit,
  createDefaultStats,
  getMostUsedUnit,
  incrementRuns,
  parseStats,
  recordRun,
  recordUnitUsage,
  recordVictory,
  updateFurthestInfiniteRound,
  type PlayerStats,
} from "./stats";

const runStats: RunStats = {
  damageDealt: 10,
  poisonDealt: 2,
  shieldDealt: 1,
  regenDealt: 3,
  healDealt: 4,
  mostPowerfulUnit: null,
  totalUnitsRecruited: 0,
  unitUsage: {},
};

describe("createDefaultStats", () => {
  it("returns the default shape with zeroed counters and empty collections", () => {
    expect(createDefaultStats()).toEqual({
      totalRuns: 0,
      bronzeVictories: 0,
      silverVictories: 0,
      goldVictories: 0,
      furthestInfiniteRound: 0,
      unitUsage: {},
      coreUnitWins: {},
      totalHealed: 0,
      totalDamage: 0,
      totalShield: 0,
      totalPoison: 0,
      totalRegen: 0,
      mostPowerfulUnit: null,
      unlockedUnits: [],
      pendingUnlockUnits: [],
    });
  });

  it("returns a fresh object on each call", () => {
    expect(createDefaultStats()).not.toBe(createDefaultStats());
  });
});

describe("incrementRuns", () => {
  it("adds one to totalRuns without mutating the input", () => {
    const s = createDefaultStats();
    const next = incrementRuns(s);
    expect(next.totalRuns).toBe(1);
    expect(s.totalRuns).toBe(0);
  });
});

describe("recordVictory", () => {
  it("increments the matching tier counter only", () => {
    let s = createDefaultStats();
    s = recordVictory(s, "gold");
    expect(s.goldVictories).toBe(1);
    expect(s.silverVictories).toBe(0);
    expect(s.bronzeVictories).toBe(0);

    s = recordVictory(s, "silver");
    s = recordVictory(s, "bronze");
    expect(s.goldVictories).toBe(1);
    expect(s.silverVictories).toBe(1);
    expect(s.bronzeVictories).toBe(1);
  });

  it("initializes the coreUnitWins entry for a new core", () => {
    const s = recordVictory(createDefaultStats(), "gold", "mana_crystal");
    expect(s.coreUnitWins.mana_crystal).toEqual({
      bronze: 0,
      silver: 0,
      gold: 1,
    });
  });

  it("adds to the existing coreUnitWins entry on a second call", () => {
    let s = createDefaultStats();
    s = recordVictory(s, "gold", "mana_crystal");
    s = recordVictory(s, "gold", "mana_crystal");
    s = recordVictory(s, "silver", "mana_crystal");
    expect(s.coreUnitWins.mana_crystal).toEqual({
      bronze: 0,
      silver: 1,
      gold: 2,
    });
  });

  it("leaves other cores' entries untouched", () => {
    let s = createDefaultStats();
    s = recordVictory(s, "gold", "mana_crystal");
    s = recordVictory(s, "bronze", "quickstone");
    expect(s.coreUnitWins.mana_crystal).toEqual({
      bronze: 0,
      silver: 0,
      gold: 1,
    });
    expect(s.coreUnitWins.quickstone).toEqual({
      bronze: 1,
      silver: 0,
      gold: 0,
    });
  });
});

describe("recordRun", () => {
  it("accumulates all five totals", () => {
    let s = createDefaultStats();
    s = recordRun(s, runStats);
    s = recordRun(s, runStats);
    expect(s.totalDamage).toBe(20);
    expect(s.totalShield).toBe(2);
    expect(s.totalPoison).toBe(4);
    expect(s.totalRegen).toBe(6);
    expect(s.totalHealed).toBe(8);
  });
});

describe("updateFurthestInfiniteRound", () => {
  it("updates when the new wins are higher", () => {
    const s = updateFurthestInfiniteRound(createDefaultStats(), 12);
    expect(s.furthestInfiniteRound).toBe(12);
  });

  it("returns the same reference when equal", () => {
    let s = createDefaultStats();
    s = updateFurthestInfiniteRound(s, 12);
    expect(updateFurthestInfiniteRound(s, 12)).toBe(s);
  });

  it("returns the same reference when lower", () => {
    let s = createDefaultStats();
    s = updateFurthestInfiniteRound(s, 12);
    expect(updateFurthestInfiniteRound(s, 3)).toBe(s);
  });
});

describe("recordUnitUsage", () => {
  it("initializes and increments a unit's usage count", () => {
    let s = createDefaultStats();
    s = recordUnitUsage(s, "warbringer");
    expect(s.unitUsage.warbringer).toBe(1);
    s = recordUnitUsage(s, "warbringer");
    expect(s.unitUsage.warbringer).toBe(2);
  });
});

describe("checkMostPowerfulUnit", () => {
  it("stores the first unit and floors power", () => {
    const s = checkMostPowerfulUnit(createDefaultStats(), "warbringer", 42.7);
    expect(s.mostPowerfulUnit).toEqual({ name: "warbringer", power: 42 });
  });

  it("replaces when the new power is higher", () => {
    let s = checkMostPowerfulUnit(createDefaultStats(), "warbringer", 42.7);
    s = checkMostPowerfulUnit(s, "aegis_archon", 50);
    expect(s.mostPowerfulUnit).toEqual({ name: "aegis_archon", power: 50 });
  });

  it("keeps the existing unit when the new power is lower", () => {
    let s = checkMostPowerfulUnit(createDefaultStats(), "warbringer", 42.7);
    s = checkMostPowerfulUnit(s, "aegis_archon", 10);
    expect(s.mostPowerfulUnit).toEqual({ name: "warbringer", power: 42 });
  });
});

describe("getMostUsedUnit", () => {
  it("returns null when there are no entries", () => {
    expect(getMostUsedUnit(createDefaultStats())).toBeNull();
  });

  it("returns the unit with the max count", () => {
    const s: PlayerStats = {
      ...createDefaultStats(),
      unitUsage: { a: 1, b: 3, c: 2 },
    };
    expect(getMostUsedUnit(s)).toBe("b");
  });
});

describe("parseStats", () => {
  it("returns null for null or empty raw values", () => {
    expect(parseStats(null)).toBeNull();
    expect(parseStats("")).toBeNull();
  });

  it("returns null for unparseable JSON", () => {
    expect(parseStats("not json")).toBeNull();
    expect(parseStats("{")).toBeNull();
  });

  it("returns null for non-object payloads", () => {
    expect(parseStats("42")).toBeNull();
    expect(parseStats('"hello"')).toBeNull();
    expect(parseStats("null")).toBeNull();
  });

  it("round-trips a valid object", () => {
    const s: PlayerStats = {
      totalRuns: 3,
      bronzeVictories: 2,
      silverVictories: 1,
      goldVictories: 1,
      furthestInfiniteRound: 14,
      unitUsage: { warbringer: 2 },
      coreUnitWins: { mana_crystal: { bronze: 2, silver: 1, gold: 1 } },
      totalHealed: 100,
      totalDamage: 200,
      totalShield: 300,
      totalPoison: 400,
      totalRegen: 500,
      mostPowerfulUnit: { name: "warbringer", power: 42 },
      unlockedUnits: ["warbringer"],
      pendingUnlockUnits: ["mend_sage"],
    };
    expect(parseStats(JSON.stringify(s))).toEqual(s);
  });

  it("falls back to defaults/[] for invalid field types", () => {
    const parsed = parseStats(
      JSON.stringify({
        totalRuns: "x",
        bronzeVictories: true,
        unitUsage: "y",
        coreUnitWins: null,
        totalHealed: {},
        mostPowerfulUnit: { name: 5 },
        unlockedUnits: "z",
        pendingUnlockUnits: 7,
      }),
    );
    expect(parsed).toEqual({
      totalRuns: 0,
      bronzeVictories: 0,
      silverVictories: 0,
      goldVictories: 0,
      furthestInfiniteRound: 0,
      unitUsage: {},
      coreUnitWins: {},
      totalHealed: 0,
      totalDamage: 0,
      totalShield: 0,
      totalPoison: 0,
      totalRegen: 0,
      mostPowerfulUnit: null,
      unlockedUnits: [],
      pendingUnlockUnits: [],
    });
  });
});
