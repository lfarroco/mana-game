import { Unit } from "@Models/Entities/Unit";
import { getState } from "@Models/State";

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

let unitStats: Map<string, UnitCombatStats> = new Map();

export function initialize(): void {
	unitStats.clear();

	const allUnits = getState().battleData.units;

	for (const unit of allUnits) {
		unitStats.set(unit.id, {
			unitId: unit.id,
			unitName: unit.name,
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

export function trackDamage(
	sourceUnitId: string,
	damage: number,
): void {
	if (damage <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;

	stats.damageDealt += damage;
}

export function trackPoison(
	sourceUnitId: string,
	poison: number,
): void {
	if (poison <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;

	stats.poisonApplied += poison;

}

export function trackHeal(
	sourceUnitId: string,
	healing: number,
): void {
	if (healing <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;

	stats.healingDone += healing;
}

export function trackRegen(sourceUnitId: string, regen: number): void {
	if (regen <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;

	stats.regenApplied += regen;
}

export function trackShield(sourceUnitId: string, shield: number): void {
	if (shield <= 0) return;

	const stats = unitStats.get(sourceUnitId)!;

	stats.shieldGranted += shield;
}


export function getUnitStats(unitId: string): UnitCombatStats | undefined {
	return unitStats.get(unitId);
}

export function stop(): void {

	console.log("[CombatStatsTracker] Stopped and finalized stats");
}


export function reset(): void {
	unitStats.clear();
}
