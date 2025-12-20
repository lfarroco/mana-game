import { storage } from "../Storage";

const STORAGE_KEY = "mana-game-player-stats-v1";

export type PlayerStats = {
	totalRuns: number;
	bronzeVictories: number;
	silverVictories: number;
	goldVictories: number;
	furthestInfiniteRound: number;
	unitUsage: Record<string, number>;
	coreUnitWins: Record<string, { bronze: number; silver: number; gold: number }>;
	mostPowerfulUnit: { name: string; power: number } | null;
	unlockedUnits: string[];
	pendingUnlockUnits: string[];
};

export type VictoryTier = "bronze" | "silver" | "gold";

const defaultStats: PlayerStats = {
	totalRuns: 0,
	bronzeVictories: 0,
	silverVictories: 0,
	goldVictories: 0,
	furthestInfiniteRound: 0,
	unitUsage: {},
	coreUnitWins: {},
	mostPowerfulUnit: null,
	unlockedUnits: [],
	pendingUnlockUnits: [],
};

let currentStats: PlayerStats = { ...defaultStats };

function loadStats(): void {
	try {
		const saved = storage.getItem(STORAGE_KEY);
		if (!saved) return;

		const parsed = JSON.parse(saved);
		if (typeof parsed !== "object" || parsed === null) return;

		currentStats = {
			totalRuns: typeof parsed.totalRuns === "number" ? parsed.totalRuns : 0,
			bronzeVictories: typeof parsed.bronzeVictories === "number" ? parsed.bronzeVictories : 0,
			silverVictories: typeof parsed.silverVictories === "number" ? parsed.silverVictories : 0,
			goldVictories: typeof parsed.goldVictories === "number" ? parsed.goldVictories : 0,
			furthestInfiniteRound: typeof parsed.furthestInfiniteRound === "number" ? parsed.furthestInfiniteRound : 0,
			unitUsage: typeof parsed.unitUsage === "object" && parsed.unitUsage !== null ? parsed.unitUsage : {},
			coreUnitWins: typeof parsed.coreUnitWins === "object" && parsed.coreUnitWins !== null ? parsed.coreUnitWins : {},
			mostPowerfulUnit: parsed.mostPowerfulUnit && typeof parsed.mostPowerfulUnit.name === "string" ? parsed.mostPowerfulUnit : null,
			unlockedUnits: Array.isArray(parsed.unlockedUnits) ? parsed.unlockedUnits : [],
			pendingUnlockUnits: Array.isArray(parsed.pendingUnlockUnits) ? parsed.pendingUnlockUnits : [],
		};
	} catch (error) {
		console.warn("[StatsStore] Failed to load stats:", error);
	}
}

function saveStats(): void {
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(currentStats));
	} catch (error) {
		console.warn("[StatsStore] Failed to save stats:", error);
	}
}

export function init(): void {
	loadStats();
}

export function getStats(): PlayerStats {
	return { ...currentStats };
}

export function incrementRunsPlayed(): void {
	currentStats.totalRuns++;
	saveStats();
	console.log(`[StatsStore] Runs played: ${currentStats.totalRuns}`);
}

export function recordVictory(tier: VictoryTier, coreUnitId?: string): void {
	switch (tier) {
		case "gold":
			currentStats.goldVictories++;
			break;
		case "silver":
			currentStats.silverVictories++;
			break;
		case "bronze":
			currentStats.bronzeVictories++;
			break;
	}

	if (coreUnitId) {
		if (!currentStats.coreUnitWins[coreUnitId]) {
			currentStats.coreUnitWins[coreUnitId] = { bronze: 0, silver: 0, gold: 0 };
		}
		currentStats.coreUnitWins[coreUnitId][tier]++;
		console.log(`[StatsStore] Recorded ${tier} victory for core unit: ${coreUnitId}`);
	}

	saveStats();
	console.log(`[StatsStore] Recorded ${tier} victory`);
}

export function updateFurthestInfiniteRound(wins: number): void {
	if (wins > currentStats.furthestInfiniteRound) {
		currentStats.furthestInfiniteRound = wins;
		saveStats();
		console.log(`[StatsStore] New furthest infinite mode: ${wins} wins`);
	}
}

export function recordUnitUsage(name: string): void {
	currentStats.unitUsage[name] = (currentStats.unitUsage[name] || 0) + 1;
}

export function checkMostPowerfulUnit(name: string, power: number): void {
	if (!currentStats.mostPowerfulUnit || power > currentStats.mostPowerfulUnit.power) {
		currentStats.mostPowerfulUnit = { name, power: Math.floor(power) };
		console.log(`[StatsStore] New most powerful unit: ${name} with ${Math.floor(power)} power`);
	}
}

export function getMostUsedUnit(): string | null {
	const entries = Object.entries(currentStats.unitUsage);
	if (entries.length === 0) return null;

	let maxName = entries[0][0];
	let maxCount = entries[0][1];

	for (const [name, count] of entries) {
		if (count > maxCount) {
			maxName = name;
			maxCount = count;
		}
	}

	return maxName;
}

export function save(): void {
	saveStats();
}

export function unlockUnit(unitId: string): void {
	if (!currentStats.unlockedUnits.includes(unitId) && !currentStats.pendingUnlockUnits.includes(unitId)) {
		currentStats.pendingUnlockUnits.push(unitId);
		saveStats();
		console.log(`[StatsStore] Pending unlock for unit: ${unitId}`);
	}
}

export function confirmUnlock(unitId: string): void {
	if (currentStats.pendingUnlockUnits.includes(unitId)) {
		currentStats.pendingUnlockUnits = currentStats.pendingUnlockUnits.filter(id => id !== unitId);
		if (!currentStats.unlockedUnits.includes(unitId)) {
			currentStats.unlockedUnits.push(unitId);
		}
		saveStats();
		console.log(`[StatsStore] Confirmed unlock for unit: ${unitId}`);
	}
}

export function getPendingUnlocks(): string[] {
	return [...currentStats.pendingUnlockUnits];
}

export function isUnitUnlocked(unitId: string): boolean {
	return currentStats.unlockedUnits.includes(unitId);
}

export function lockUnit(unitId: string): void {
	currentStats.unlockedUnits = currentStats.unlockedUnits.filter(id => id !== unitId);
	currentStats.pendingUnlockUnits = currentStats.pendingUnlockUnits.filter(id => id !== unitId);
	saveStats();
	console.log(`[StatsStore] Locked unit: ${unitId}`);
}
