import { RunStats } from "@Models/State";
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
	totalHealed: number;
	totalDamage: number;
	totalShield: number;
	totalPoison: number;
	totalRegen: number;
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
	totalHealed: 0,
	totalDamage: 0,
	totalShield: 0,
	totalPoison: 0,
	totalRegen: 0,
	mostPowerfulUnit: null,
	unlockedUnits: [],
	pendingUnlockUnits: [],
};

let currentStats: PlayerStats = { ...defaultStats };

function checkUnlockConditions() {

	const getWins = (coreId: string, tier: VictoryTier) => {
		return currentStats.coreUnitWins[coreId]?.[tier] || 0;
	};

	const getWinsOrBetter = (coreId: string, tier: VictoryTier) => {
		const wins = currentStats.coreUnitWins[coreId];
		if (!wins) return 0;
		if (tier === "gold") return wins.gold;
		if (tier === "silver") return wins.silver + wins.gold;
		return wins.bronze + wins.silver + wins.gold;
	};

	// Helper to check wins for ANY core
	const getTotalWinsOrBetter = (tier: VictoryTier) => {
		let total = 0;
		for (const coreId in currentStats.coreUnitWins) {
			const wins = currentStats.coreUnitWins[coreId];
			if (tier === "gold") total += wins.gold;
			else if (tier === "silver") total += wins.silver + wins.gold;
			else total += wins.bronze + wins.silver + wins.gold;
		}
		return total;
	};


	if (currentStats.furthestInfiniteRound >= 20) unlockUnit("walking_reactor");

	if (getWins("mana_crystal", "gold") >= 1) unlockUnit("spectral_knight");

	if (getWins("quickstone", "gold") >= 1) unlockUnit("windlash_serpent");

	if (getWins("purple_crystal", "gold") >= 1) unlockUnit("corruption_bringer");

	if (getWins("critical_crystal", "gold") >= 1) unlockUnit("frontline_dasher");

	if (getWins("growth_crystal", "gold") >= 1) unlockUnit("life_balancekeeper");

	if (getWins("protective_crystal", "gold") >= 1) unlockUnit("destiny_balancer");

	if (getTotalWinsOrBetter("bronze") >= 1) unlockUnit("cadence_warden");

	if (getWinsOrBetter("mana_crystal", "bronze") >= 3) unlockUnit("essence_harvester");

	if (getWinsOrBetter("purple_crystal", "bronze") >= 3) unlockUnit("plague_incubator");

	if (getWinsOrBetter("protective_crystal", "bronze") >= 3) unlockUnit("tempest_ravager");

	if (getTotalWinsOrBetter("bronze") >= 5) unlockUnit("paragon");

	if (getWinsOrBetter("growth_crystal", "bronze") >= 3) unlockUnit("vitality_channeler");

	if (currentStats.totalHealed >= 10000) unlockUnit("mend_sage");

	if (currentStats.totalDamage >= 10000) unlockUnit("warbringer");

	if (currentStats.totalShield >= 10000) unlockUnit("aegis_archon");

	if (currentStats.totalPoison >= 1000) unlockUnit("plague_sovereign");

	if (currentStats.totalRegen >= 1000) unlockUnit("life_weaver");

	if (getWinsOrBetter("critical_crystal", "bronze") >= 3) unlockUnit("fate_shifter");
}

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
			totalHealed: typeof parsed.totalHealed === "number" ? parsed.totalHealed : 0,
			totalDamage: typeof parsed.totalDamage === "number" ? parsed.totalDamage : 0,
			totalShield: typeof parsed.totalShield === "number" ? parsed.totalShield : 0,
			totalPoison: typeof parsed.totalPoison === "number" ? parsed.totalPoison : 0,
			totalRegen: typeof parsed.totalRegen === "number" ? parsed.totalRegen : 0,
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
	checkUnlockConditions();
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

	checkUnlockConditions();
	saveStats();
	console.log(`[StatsStore] Recorded ${tier} victory`);
}

export function updateFurthestInfiniteRound(wins: number): void {
	if (wins > currentStats.furthestInfiniteRound) {
		currentStats.furthestInfiniteRound = wins;
		checkUnlockConditions();
		saveStats();
		console.log(`[StatsStore] New furthest infinite mode: ${wins} wins`);
	}
}

export function recordRunStats(runStats: RunStats): void {
	currentStats.totalDamage += runStats.damageDealt;
	currentStats.totalShield += runStats.shieldDealt;
	currentStats.totalPoison += runStats.poisonDealt;
	currentStats.totalRegen += runStats.regenDealt;
	currentStats.totalHealed += runStats.healDealt;

	checkUnlockConditions();
	saveStats();
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

export function forceCheckUnlocks(): void {
	checkUnlockConditions();
}
