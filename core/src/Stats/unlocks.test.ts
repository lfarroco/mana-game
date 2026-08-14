/// <reference types="jest" />

import { createDefaultStats, recordVictory, type PlayerStats } from "./stats";
import { evaluateUnlocks } from "./unlocks";

describe("evaluateUnlocks", () => {
  it("returns [] when unlocks are disabled", () => {
    const s: PlayerStats = {
      ...createDefaultStats(),
      furthestInfiniteRound: 25,
      totalDamage: 20000,
      coreUnitWins: { mana_crystal: { bronze: 5, silver: 5, gold: 5 } },
    };
    expect(evaluateUnlocks(s, false)).toEqual([]);
  });

  it("a single mana_crystal gold win queues spectral_knight (plus cadence_warden) but not the 3-win bronze units yet", () => {
    let s = createDefaultStats();
    s = recordVictory(s, "gold", "mana_crystal");
    const result = evaluateUnlocks(s, true);
    expect(result).toEqual(["spectral_knight", "cadence_warden"]);
    expect(result).not.toContain("essence_harvester");
    expect(result).not.toContain("plague_incubator");
    expect(result).not.toContain("tempest_ravager");
    expect(result).not.toContain("vitality_channeler");
    expect(result).not.toContain("fate_shifter");
  });

  it("total bronze-or-better wins >= 5 queues paragon", () => {
    const s: PlayerStats = {
      ...createDefaultStats(),
      coreUnitWins: { mana_crystal: { bronze: 3, silver: 2, gold: 0 } },
    };
    const result = evaluateUnlocks(s, true);
    expect(result).toContain("paragon");
  });

  it("totalDamage >= 10000 queues warbringer", () => {
    const s: PlayerStats = { ...createDefaultStats(), totalDamage: 10000 };
    expect(evaluateUnlocks(s, true)).toEqual(["warbringer"]);

    const below: PlayerStats = { ...createDefaultStats(), totalDamage: 9999 };
    expect(evaluateUnlocks(below, true)).toEqual([]);
  });

  it("totalPoison >= 1000 queues plague_sovereign", () => {
    const s: PlayerStats = { ...createDefaultStats(), totalPoison: 1000 };
    expect(evaluateUnlocks(s, true)).toEqual(["plague_sovereign"]);

    const below: PlayerStats = { ...createDefaultStats(), totalPoison: 999 };
    expect(evaluateUnlocks(below, true)).toEqual([]);
  });

  it("critical_crystal bronze-or-better >= 3 queues fate_shifter", () => {
    const s: PlayerStats = {
      ...createDefaultStats(),
      coreUnitWins: { critical_crystal: { bronze: 3, silver: 0, gold: 0 } },
    };
    const result = evaluateUnlocks(s, true);
    expect(result).toContain("fate_shifter");
    expect(result).not.toContain("frontline_dasher");
  });

  it("an id already unlocked is not re-queued", () => {
    const s: PlayerStats = {
      ...createDefaultStats(),
      totalDamage: 10000,
      unlockedUnits: ["warbringer"],
    };
    expect(evaluateUnlocks(s, true)).toEqual([]);
  });

  it("an id already pending is not re-queued", () => {
    const s: PlayerStats = {
      ...createDefaultStats(),
      totalDamage: 10000,
      pendingUnlockUnits: ["warbringer"],
    };
    expect(evaluateUnlocks(s, true)).toEqual([]);
  });

  it("furthestInfiniteRound >= 20 queues walking_reactor", () => {
    const s: PlayerStats = {
      ...createDefaultStats(),
      furthestInfiniteRound: 20,
    };
    expect(evaluateUnlocks(s, true)).toEqual(["walking_reactor"]);

    const below: PlayerStats = {
      ...createDefaultStats(),
      furthestInfiniteRound: 19,
    };
    expect(evaluateUnlocks(below, true)).toEqual([]);
  });
});
