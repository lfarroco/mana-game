import type { VictoryTier } from "../Achievements/victoryTier";
import type { RunStats } from "../types/session";
import { evaluateUnlocks } from "./unlocks";
import {
  checkMostPowerfulUnit as checkMostPowerfulUnitReducer,
  createDefaultStats,
  getMostUsedUnit as getMostUsedUnitReducer,
  incrementRuns,
  parseStats,
  recordRun,
  recordUnitUsage as recordUnitUsageReducer,
  recordVictory as recordVictoryReducer,
  updateFurthestInfiniteRound as updateFurthestInfiniteRoundReducer,
  STATS_STORAGE_KEY,
  type PlayerStats,
} from "./stats";

/** Minimal key-value storage contract (injected — core never touches localStorage). */
export type StatsStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type StatsConfig = {
  enableUnlocks: boolean;
};

export type StatsStore = {
  init(): void;
  getStats(): PlayerStats;
  incrementRunsPlayed(): void;
  recordVictory(tier: VictoryTier, coreUnitId?: string): void;
  updateFurthestInfiniteRound(wins: number): void;
  recordRunStats(runStats: RunStats): void;
  recordUnitUsage(name: string): void;
  checkMostPowerfulUnit(name: string, power: number): void;
  getMostUsedUnit(): string | null;
  save(): void;
  unlockUnit(unitId: string): void;
  confirmUnlock(unitId: string): void;
  getPendingUnlocks(): string[];
  isUnitUnlocked(unitId: string): boolean;
  lockUnit(unitId: string): void;
};

/** Mutable player-stats store backed by an injected storage. */
export function createStatsStore(
  storage: StatsStorage,
  config: StatsConfig,
): StatsStore {
  let currentStats: PlayerStats = createDefaultStats();

  const saveStats = (): void => {
    try {
      storage.setItem(STATS_STORAGE_KEY, JSON.stringify(currentStats));
    } catch (error) {
      console.warn("StatsStore", "Failed to save stats", { error });
    }
  };

  const loadStats = (): void => {
    try {
      const parsed = parseStats(storage.getItem(STATS_STORAGE_KEY));
      if (parsed) currentStats = parsed;
    } catch (error) {
      console.warn("StatsStore", "Failed to load stats", { error });
    }
  };

  const checkUnlockConditions = (): void => {
    const newIds = evaluateUnlocks(currentStats, config.enableUnlocks);
    if (newIds.length > 0) {
      currentStats = {
        ...currentStats,
        pendingUnlockUnits: [...currentStats.pendingUnlockUnits, ...newIds],
      };
      saveStats();
    }
  };

  const init = (): void => {
    loadStats();
    checkUnlockConditions();
  };

  const getStats = (): PlayerStats => ({ ...currentStats });

  const incrementRunsPlayed = (): void => {
    currentStats = incrementRuns(currentStats);
    saveStats();
  };

  const recordVictory = (tier: VictoryTier, coreUnitId?: string): void => {
    currentStats = recordVictoryReducer(currentStats, tier, coreUnitId);
    checkUnlockConditions();
    saveStats();
  };

  const updateFurthestInfiniteRound = (wins: number): void => {
    const next = updateFurthestInfiniteRoundReducer(currentStats, wins);
    if (next !== currentStats) {
      currentStats = next;
      checkUnlockConditions();
      saveStats();
    }
  };

  const recordRunStats = (runStats: RunStats): void => {
    currentStats = recordRun(currentStats, runStats);
    checkUnlockConditions();
    saveStats();
  };

  const recordUnitUsage = (name: string): void => {
    currentStats = recordUnitUsageReducer(currentStats, name);
  };

  const checkMostPowerfulUnit = (name: string, power: number): void => {
    currentStats = checkMostPowerfulUnitReducer(currentStats, name, power);
  };

  const getMostUsedUnit = (): string | null =>
    getMostUsedUnitReducer(currentStats);

  const save = (): void => {
    saveStats();
  };

  const unlockUnit = (unitId: string): void => {
    if (!config.enableUnlocks) return;
    if (
      !currentStats.unlockedUnits.includes(unitId) &&
      !currentStats.pendingUnlockUnits.includes(unitId)
    ) {
      currentStats = {
        ...currentStats,
        pendingUnlockUnits: [...currentStats.pendingUnlockUnits, unitId],
      };
      saveStats();
    }
  };

  const confirmUnlock = (unitId: string): void => {
    if (currentStats.pendingUnlockUnits.includes(unitId)) {
      currentStats = {
        ...currentStats,
        pendingUnlockUnits: currentStats.pendingUnlockUnits.filter(
          (id) => id !== unitId,
        ),
        unlockedUnits: currentStats.unlockedUnits.includes(unitId)
          ? currentStats.unlockedUnits
          : [...currentStats.unlockedUnits, unitId],
      };
      saveStats();
    }
  };

  const getPendingUnlocks = (): string[] => [
    ...currentStats.pendingUnlockUnits,
  ];

  const isUnitUnlocked = (unitId: string): boolean =>
    currentStats.unlockedUnits.includes(unitId);

  const lockUnit = (unitId: string): void => {
    currentStats = {
      ...currentStats,
      unlockedUnits: currentStats.unlockedUnits.filter((id) => id !== unitId),
      pendingUnlockUnits: currentStats.pendingUnlockUnits.filter(
        (id) => id !== unitId,
      ),
    };
    saveStats();
  };

  return {
    init,
    getStats,
    incrementRunsPlayed,
    recordVictory,
    updateFurthestInfiniteRound,
    recordRunStats,
    recordUnitUsage,
    checkMostPowerfulUnit,
    getMostUsedUnit,
    save,
    unlockUnit,
    confirmUnlock,
    getPendingUnlocks,
    isUnitUnlocked,
    lockUnit,
  };
}
