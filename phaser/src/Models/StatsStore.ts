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
	unitUsage: Record<string, number>; // cardId -> times used
	mostPowerfulUnit: { cardId: string; power: number } | null;
};

export type VictoryTier = "bronze" | "silver" | "gold";

const defaultStats: PlayerStats = {
	totalRuns: 0,
	bronzeVictories: 0,
	silverVictories: 0,
	goldVictories: 0,
	furthestInfiniteRound: 0,
	unitUsage: {},
	mostPowerfulUnit: null,
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
			unitUsage: typeof parsed.unitUsage === "object" && parsed.unitUsage !== null ? parsed.unitUsage : {},
			mostPowerfulUnit: parsed.mostPowerfulUnit && typeof parsed.mostPowerfulUnit.cardId === "string" ? parsed.mostPowerfulUnit : null,
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

/**
 * Record unit usage for tracking most used unit
 */
export function recordUnitUsage(cardId: string): void {
	currentStats.unitUsage[cardId] = (currentStats.unitUsage[cardId] || 0) + 1;
	// Don't save here, will batch save with other stats
}

/**
 * Check and update most powerful unit record
 */
export function checkMostPowerfulUnit(cardId: string, power: number): void {
	if (!currentStats.mostPowerfulUnit || power > currentStats.mostPowerfulUnit.power) {
		currentStats.mostPowerfulUnit = { cardId, power: Math.floor(power) };
		console.log(`[StatsStore] New most powerful unit: ${cardId} with ${Math.floor(power)} power`);
	}
	// Don't save here, will batch save with other stats
}

/**
 * Get the most used unit's cardId
 */
export function getMostUsedUnit(): string | null {
	const entries = Object.entries(currentStats.unitUsage);
	if (entries.length === 0) return null;

	let maxCardId = entries[0][0];
	let maxCount = entries[0][1];

	for (const [cardId, count] of entries) {
		if (count > maxCount) {
			maxCardId = cardId;
			maxCount = count;
		}
	}

	return maxCardId;
}

/**
 * Force save stats (call after batch operations)
 */
export function save(): void {
	saveStats();
}
