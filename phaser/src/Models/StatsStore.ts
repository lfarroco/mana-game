import { createStatsStore, type StatsStore as StatsStoreApi } from "@game/Stats/statsStore";
import { GAME_CONFIG } from "@config";

export type { PlayerStats, VictoryTier } from "@game/Stats/stats";

const store: StatsStoreApi = createStatsStore(
	{
		getItem: (key) => localStorage.getItem(key),
		setItem: (key, value) => localStorage.setItem(key, value),
		removeItem: (key) => localStorage.removeItem(key),
	},
	{ enableUnlocks: GAME_CONFIG.ENABLE_UNLOCKS }
);

export const init = store.init;
export const getStats = store.getStats;
export const incrementRunsPlayed = store.incrementRunsPlayed;
export const recordVictory = store.recordVictory;
export const updateFurthestInfiniteRound = store.updateFurthestInfiniteRound;
export const recordRunStats = store.recordRunStats;
export const recordUnitUsage = store.recordUnitUsage;
export const checkMostPowerfulUnit = store.checkMostPowerfulUnit;
export const getMostUsedUnit = store.getMostUsedUnit;
export const save = store.save;
export const unlockUnit = store.unlockUnit;
export const confirmUnlock = store.confirmUnlock;
export const getPendingUnlocks = store.getPendingUnlocks;
export const isUnitUnlocked = store.isUnitUnlocked;
export const lockUnit = store.lockUnit;
