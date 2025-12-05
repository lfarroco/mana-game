/**
 * StatsStore - Persistent player statistics storage
 * Tracks lifetime game stats like runs played, victories by tier, and infinite mode progress
 */
import { storage } from "../Storage";

const STORAGE_KEY = "mana-game-player-stats-v1";

export type PlayerStats = {
	totalRuns: number;
	bronzeVictories: number;
	silverVictories: number;
	goldVictories: number;
	furthestInfiniteRound: number;
};

export type VictoryTier = "bronze" | "silver" | "gold";

const defaultStats: PlayerStats = {
	totalRuns: 0,
	bronzeVictories: 0,
	silverVictories: 0,
	goldVictories: 0,
	furthestInfiniteRound: 0,
};

let currentStats: PlayerStats = { ...defaultStats };

/**
 * Load stats from storage
 */
function loadStats(): void {
	try {
		const saved = storage.getItem(STORAGE_KEY);
		if (!saved) return;

		const parsed = JSON.parse(saved);
		if (typeof parsed !== "object" || parsed === null) return;

		// Validate and merge with defaults
		currentStats = {
			totalRuns: typeof parsed.totalRuns === "number" ? parsed.totalRuns : 0,
			bronzeVictories: typeof parsed.bronzeVictories === "number" ? parsed.bronzeVictories : 0,
			silverVictories: typeof parsed.silverVictories === "number" ? parsed.silverVictories : 0,
			goldVictories: typeof parsed.goldVictories === "number" ? parsed.goldVictories : 0,
			furthestInfiniteRound: typeof parsed.furthestInfiniteRound === "number" ? parsed.furthestInfiniteRound : 0,
		};
	} catch (error) {
		console.warn("[StatsStore] Failed to load stats:", error);
	}
}

/**
 * Save stats to storage
 */
function saveStats(): void {
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(currentStats));
	} catch (error) {
		console.warn("[StatsStore] Failed to save stats:", error);
	}
}

/**
 * Initialize the stats store - call on app startup
 */
export function init(): void {
	loadStats();
}

/**
 * Get current stats
 */
export function getStats(): PlayerStats {
	return { ...currentStats };
}

/**
 * Increment total runs played
 */
export function incrementRunsPlayed(): void {
	currentStats.totalRuns++;
	saveStats();
	console.log(`[StatsStore] Runs played: ${currentStats.totalRuns}`);
}

/**
 * Record a victory of a specific tier
 * Higher tiers also count for lower tiers (gold = gold + silver + bronze)
 */
export function recordVictory(tier: VictoryTier): void {
	switch (tier) {
		case "gold":
			currentStats.goldVictories++;
			currentStats.silverVictories++;
			currentStats.bronzeVictories++;
			break;
		case "silver":
			currentStats.silverVictories++;
			currentStats.bronzeVictories++;
			break;
		case "bronze":
			currentStats.bronzeVictories++;
			break;
	}
	saveStats();
	console.log(`[StatsStore] Recorded ${tier} victory`);
}

/**
 * Update furthest infinite round if the new value is higher
 */
export function updateFurthestInfiniteRound(wins: number): void {
	if (wins > currentStats.furthestInfiniteRound) {
		currentStats.furthestInfiniteRound = wins;
		saveStats();
		console.log(`[StatsStore] New furthest infinite mode: ${wins} wins`);
	}
}
