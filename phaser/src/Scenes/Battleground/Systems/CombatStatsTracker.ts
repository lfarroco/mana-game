import { getName } from "@i18n/i18n";
import { Unit } from "@Models/Entities/Unit";
import { getState } from "@Models/State";
import { processReactions } from "TriggerSystem/TriggerSystem";

export type UnitCombatStats = {
	unitId: string;
	unitName?: string;
	forceId: string;

	actionsPerformed: number;
	reflected: number;
	damageDealt: number;
	poisonApplied: number;
	healingDone: number;
	regenApplied: number;
	shieldGranted: number;
};

type CurrentCombatStats = {
	damageDealt: number;
	poisonDealt: number;
	healDealt: number;
	regenDealt: number;
	shieldDealt: number;
};

let unitStats: Map<string, UnitCombatStats> = new Map();
let currentCombatStats: Map<string, CurrentCombatStats> = new Map();

function getForceStats(forceId: string): CurrentCombatStats {
	if (!currentCombatStats.has(forceId)) {
		currentCombatStats.set(forceId, {
			damageDealt: 0,
			poisonDealt: 0,
			healDealt: 0,
			regenDealt: 0,
			shieldDealt: 0,
		});
	}
	return currentCombatStats.get(forceId)!;
}

export function initialize(): void {
	unitStats.clear();
	currentCombatStats.clear();

	const allUnits = getState().battleData.units;

	for (const unit of allUnits) {
		unitStats.set(unit.id, {
			unitId: unit.id,
			unitName: getName(unit.cardId),
			forceId: unit.force,
			damageDealt: 0,
			reflected: 0,
			poisonApplied: 0,
			healingDone: 0,
			regenApplied: 0,
			shieldGranted: 0,
			actionsPerformed: 0,
		});
	}

	console.log("[CombatStatsTracker] Initialized for new combat");
}

export function trackAction(payload: { unit: Unit }): void {
	const stats = unitStats.get(payload.unit.id)!;

	stats.actionsPerformed += 1;
	console.log(
		`[CombatStatsTracker] Unit ${payload.unit.id} performed an action (total: ${stats.actionsPerformed})`
	);
}

const DAMAGE_THRESHOLD = 100;
const POISON_THRESHOLD = 10;
const HEAL_THRESHOLD = 100;
const REGEN_THRESHOLD = 10;
const SHIELD_THRESHOLD = 100;

type StatConfig = {
	unitStatKey: keyof UnitCombatStats;
	forceStatKey: keyof CurrentCombatStats;
	threshold?: number;
	reactionId?: string;
};

const STAT_CONFIGS: Record<string, StatConfig> = {
	damage: {
		unitStatKey: "damageDealt",
		forceStatKey: "damageDealt",
		threshold: DAMAGE_THRESHOLD,
		reactionId: "every_100_damage",
	},
	poison: {
		unitStatKey: "poisonApplied",
		forceStatKey: "poisonDealt",
		threshold: POISON_THRESHOLD,
		reactionId: "every_10_poison",
	},
	heal: {
		unitStatKey: "healingDone",
		forceStatKey: "healDealt",
		threshold: HEAL_THRESHOLD,
		reactionId: "every_100_heal",
	},
	regen: {
		unitStatKey: "regenApplied",
		forceStatKey: "regenDealt",
		threshold: REGEN_THRESHOLD,
		reactionId: "every_10_regen",
	},
	shield: {
		unitStatKey: "shieldGranted",
		forceStatKey: "shieldDealt",
		threshold: SHIELD_THRESHOLD,
		reactionId: "every_100_shield",
	},
};

function trackStat(
	amount: number,
	sourceUnitId: string,
	configKey: keyof typeof STAT_CONFIGS
) {
	if (amount <= 0) return;

	const config = STAT_CONFIGS[configKey];
	const stats = unitStats.get(sourceUnitId)!;

	// Update Unit Stats
	(stats[config.unitStatKey] as number) += amount;

	// Update Force Stats & Check Reactor
	const forceStats = getForceStats(stats.forceId);
	const oldTotal = forceStats[config.forceStatKey];
	forceStats[config.forceStatKey] += amount;

	if (config.threshold && config.reactionId) {
		const oldThresholds = Math.floor(oldTotal / config.threshold);
		const newThresholds = Math.floor(forceStats[config.forceStatKey] / config.threshold);
		const diff = newThresholds - oldThresholds;

		if (diff > 0) {
			const unit = getState().battleData.units.find((u) => u.id === sourceUnitId)!;
			processReactions(unit, { id: config.reactionId as any }, diff);
		}
	}
}

export function trackDamage(sourceUnitId: string, damage: number): void {
	trackStat(damage, sourceUnitId, "damage");
}

export function trackPoison(sourceUnitId: string, poison: number): void {
	trackStat(poison, sourceUnitId, "poison");
}

export function trackHeal(sourceUnitId: string, healing: number): void {
	trackStat(healing, sourceUnitId, "heal");
}

export function trackRegen(sourceUnitId: string, regen: number): void {
	trackStat(regen, sourceUnitId, "regen");
}

export function trackShield(sourceUnitId: string, shield: number): void {
	trackStat(shield, sourceUnitId, "shield");
}


export function getUnitStats(unitId: string): UnitCombatStats | undefined {
	return unitStats.get(unitId);
}

export function stop(): void {
	const { gameData } = getState();
	const { runStats } = gameData;

	const playerForceId = gameData.player.id;
	const playerStats = getForceStats(playerForceId);

	runStats.damageDealt += playerStats.damageDealt;
	runStats.poisonDealt += playerStats.poisonDealt;
	runStats.healDealt += playerStats.healDealt;
	runStats.regenDealt += playerStats.regenDealt;
	runStats.shieldDealt += playerStats.shieldDealt;

	const { player } = getState().gameData;
	for (const unit of player.units) {

		if (!runStats.mostPowerfulUnit || unit.power > runStats.mostPowerfulUnit.power) {
			runStats.mostPowerfulUnit = { name: getName(unit.cardId), power: unit.power };
		}
	}

	console.log("[CombatStatsTracker] Stopped and finalized stats");
}


export function reset(): void {
	unitStats.clear();
}
