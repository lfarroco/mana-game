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
			unitName: getName(unit),
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

export function trackDamage(
	sourceUnitId: string,
	damage: number,
): void {
	if (damage <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;
	stats.damageDealt += damage;

	trackGlobalDamage(damage, sourceUnitId);
}

function trackGlobalDamage(damage: number, sourceUnitId: string) {
	const unitStats = getUnitStats(sourceUnitId)!;

	const forceStats = getForceStats(unitStats.forceId);

	const oldTotal = forceStats.damageDealt;
	forceStats.damageDealt += damage;

	const oldThresholds = Math.floor(oldTotal / DAMAGE_THRESHOLD);
	const newThresholds = Math.floor(forceStats.damageDealt / DAMAGE_THRESHOLD);

	const diff = newThresholds - oldThresholds;

	if (diff > 0) {
		const unit = getState().battleData.units.find(u => u.id === sourceUnitId)!;
		for (let i = 0; i < diff; i++) {
			processReactions(unit, { id: "every_100_damage" });
		}
	}
}

export function trackPoison(
	sourceUnitId: string,
	poison: number,
): void {
	if (poison <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;
	stats.poisonApplied += poison;

	const forceStats = getForceStats(stats.forceId);
	forceStats.poisonDealt += poison;
}

export function trackHeal(
	sourceUnitId: string,
	healing: number,
): void {
	if (healing <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;
	stats.healingDone += healing;

	const forceStats = getForceStats(stats.forceId);
	forceStats.healDealt += healing;
}

export function trackRegen(sourceUnitId: string, regen: number): void {
	if (regen <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;
	stats.regenApplied += regen;

	const forceStats = getForceStats(stats.forceId);
	forceStats.regenDealt += regen;
}

export function trackShield(sourceUnitId: string, shield: number): void {
	if (shield <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;
	stats.shieldGranted += shield;

	const forceStats = getForceStats(stats.forceId);
	forceStats.shieldDealt += shield;
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
			runStats.mostPowerfulUnit = { name: getName(unit), power: unit.power };
		}
	}

	console.log("[CombatStatsTracker] Stopped and finalized stats");
}


export function reset(): void {
	unitStats.clear();
}
