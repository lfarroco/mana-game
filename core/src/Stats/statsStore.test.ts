/// <reference types="jest" />

import {
  createDefaultStats,
  STATS_STORAGE_KEY,
  type PlayerStats,
} from "./stats";
import { createStatsStore, type StatsStorage } from "./statsStore";

function memoryStorage(): StatsStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("createStatsStore", () => {
  it("init with nothing stored keeps defaults", () => {
    const store = createStatsStore(memoryStorage(), { enableUnlocks: true });
    store.init();
    expect(store.getStats()).toEqual(createDefaultStats());
  });

  it("recordVictory persists and reloads in a fresh store over the same storage", () => {
    const storage = memoryStorage();
    const store = createStatsStore(storage, { enableUnlocks: true });
    store.init();
    store.recordVictory("gold", "mana_crystal");

    const fresh = createStatsStore(storage, { enableUnlocks: true });
    fresh.init();
    const stats = fresh.getStats();
    expect(stats.goldVictories).toBe(1);
    expect(stats.coreUnitWins.mana_crystal).toEqual({
      bronze: 0,
      silver: 0,
      gold: 1,
    });
  });

  it("unlockUnit respects enableUnlocks=false and queues nothing", () => {
    const store = createStatsStore(memoryStorage(), { enableUnlocks: false });
    store.init();
    store.unlockUnit("warbringer");
    expect(store.getPendingUnlocks()).toEqual([]);
    expect(store.getStats().pendingUnlockUnits).toEqual([]);
  });

  it("unlockUnit → confirmUnlock → isUnitUnlocked flow persists across a reload", () => {
    const storage = memoryStorage();
    const store = createStatsStore(storage, { enableUnlocks: true });
    store.init();
    store.unlockUnit("warbringer");
    expect(store.getPendingUnlocks()).toEqual(["warbringer"]);
    store.confirmUnlock("warbringer");
    expect(store.getPendingUnlocks()).toEqual([]);
    expect(store.isUnitUnlocked("warbringer")).toBe(true);

    const fresh = createStatsStore(storage, { enableUnlocks: true });
    fresh.init();
    expect(fresh.isUnitUnlocked("warbringer")).toBe(true);
    expect(fresh.getPendingUnlocks()).toEqual([]);
  });

  it("lockUnit clears the id from both lists", () => {
    const storage = memoryStorage();
    const store = createStatsStore(storage, { enableUnlocks: true });
    store.init();
    store.unlockUnit("warbringer");
    store.confirmUnlock("warbringer");
    store.unlockUnit("mend_sage");
    store.lockUnit("warbringer");

    expect(store.isUnitUnlocked("warbringer")).toBe(false);
    expect(store.getPendingUnlocks()).toEqual(["mend_sage"]);
  });

  it("getStats returns a copy; mutating it does not affect the store", () => {
    const store = createStatsStore(memoryStorage(), { enableUnlocks: true });
    store.init();
    const stats = store.getStats();
    stats.totalRuns = 99;
    expect(store.getStats().totalRuns).toBe(0);
  });

  it("storage key matches the legacy mana-game-player-stats-v1 key", () => {
    const storage = memoryStorage();
    const store = createStatsStore(storage, { enableUnlocks: true });
    store.init();
    store.incrementRunsPlayed();
    expect(storage.getItem(STATS_STORAGE_KEY)).not.toBeNull();
    expect(
      (JSON.parse(storage.getItem(STATS_STORAGE_KEY)!) as PlayerStats)
        .totalRuns,
    ).toBe(1);
  });
});
