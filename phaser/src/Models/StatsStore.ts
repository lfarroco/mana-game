import { createStatsStore, type StatsStore as StatsStoreApi } from "@game/Stats/statsStore";
import { GAME_CONFIG } from "@config";

export type { PlayerStats, VictoryTier } from "@game/Stats/stats";

/**
 * localStorage-backed adapter — core never touches localStorage itself.
 *
 * Every access is guarded, mirroring `Systems/Storage/LocalStorageProvider` and
 * `SessionManager`. `localStorage` throws on a machine whose storage is blocked
 * (SecurityError / policy), locked down (some WebViews, private mode) or over
 * quota — and this store is read at boot (`StatsStore.init()` in BootScene) and
 * written from the run-complete screen, where an unguarded throw meant the
 * victory/game-over screen never rendered at all (the player-reported "the
 * victory screen is just gone"). Stats are cosmetic; losing them is always
 * better than losing the screen.
 */
const guardedStorage = {
	getItem: (key: string): string | null => {
		try {
			return localStorage.getItem(key);
		} catch (error) {
			console.warn("StatsStore", `Failed to read "${key}"`, error);
			return null;
		}
	},
	setItem: (key: string, value: string): void => {
		try {
			localStorage.setItem(key, value);
		} catch (error) {
			console.warn("StatsStore", `Failed to persist "${key}"`, error);
		}
	},
	removeItem: (key: string): void => {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.warn("StatsStore", `Failed to remove "${key}"`, error);
		}
	},
};

const store: StatsStoreApi = createStatsStore(guardedStorage, {
	enableUnlocks: GAME_CONFIG.ENABLE_UNLOCKS,
});

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
