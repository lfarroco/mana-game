import { Unit } from "@Models/Entities/Unit";

export type UnitCombatStats = {
	unitId: string;
	unitName?: string;
	forceId: string;

	damageDealt: number;
	poisonApplied: number;

	healingDone: number;
	regenApplied: number;

	shieldGranted: number;

	actionsPerformed: number;
	timeAlive: number;
};

let isActive: boolean = false;
let unitStats: Map<string, UnitCombatStats> = new Map();
let combatStartTime: number = 0;

function initializeUnitStats(): void {

	const allUnits = state.battleData.units;

	for (const unit of allUnits) {
		unitStats.set(unit.id, {
			unitId: unit.id,
			unitName: unit.name,
			forceId: unit.force,
			damageDealt: 0,
			poisonApplied: 0,
			healingDone: 0,
			regenApplied: 0,
			shieldGranted: 0,
			actionsPerformed: 0,
			timeAlive: 0
		});
	}
}

export function trackMoraleChange(payload: {
	forceId: string;
	newMorale: number;
	maxMorale: number;
	totalDamage?: number;
	damageType?: "poison" | "normal" | "timeout";
	sourceUnitId?: string;
}): void {
	if (!isActive || !payload.totalDamage || payload.totalDamage <= 0) return;

	const sourceUnitId = payload.sourceUnitId;
	if (!sourceUnitId) {
		console.warn("[CombatStatsTracker] Damage event without sourceUnitId");
		return;
	}

	const stats = unitStats.get(sourceUnitId);
	if (!stats) {
		console.warn(`[CombatStatsTracker] No stats found for unit ${sourceUnitId}`);
		return;
	}

	if (payload.damageType === "poison") {
		stats.poisonApplied += payload.totalDamage;
	} else {
		stats.damageDealt += payload.totalDamage;
	}

	console.log(`[CombatStatsTracker] Unit ${sourceUnitId} dealt ${payload.totalDamage} ${payload.damageType || "normal"} damage`);
}

export function trackMoraleRestored(payload: {
	unit: Unit;
	amount: number;
	type?: 'regen' | 'direct';
	sourceUnitId?: string;
}): void {
	if (!isActive || payload.amount <= 0) return;

	const sourceUnitId = payload.sourceUnitId || payload.unit?.id;
	if (!sourceUnitId) return;

	const stats = unitStats.get(sourceUnitId);
	if (!stats) {
		console.warn(`[CombatStatsTracker] No stats found for unit ${sourceUnitId}`);
		return;
	}

	if (payload.type === 'regen') {
		stats.regenApplied += payload.amount;
	} else {
		stats.healingDone += payload.amount;
	}

	console.log(`[CombatStatsTracker] Unit ${sourceUnitId} provided ${payload.amount} ${payload.type || "direct"} healing`);
}

export function trackShieldGained(payload: {
	unit: Unit;
	amount: number;
	sourceUnitId?: string;
}): void {
	if (!isActive || payload.amount <= 0) return;

	const sourceUnitId = payload.sourceUnitId || payload.unit?.id;
	if (!sourceUnitId) return;

	const stats = unitStats.get(sourceUnitId);
	if (!stats) {
		console.warn(`[CombatStatsTracker] No stats found for unit ${sourceUnitId}`);
		return;
	}

	stats.shieldGranted += payload.amount;
	console.log(`[CombatStatsTracker] Unit ${sourceUnitId} granted ${payload.amount} shield`);
}

export function trackShieldUpdated(payload: {
	forceId: string;
	newShield: number;
	maxShield: number;
	sourceUnitId?: string;
	shieldDelta?: number;
}): void {
	if (!isActive || !payload.shieldDelta || payload.shieldDelta <= 0) return;
	if (!payload.sourceUnitId) return;

	const stats = unitStats.get(payload.sourceUnitId);
	if (!stats) {
		console.warn(`[CombatStatsTracker] No stats found for unit ${payload.sourceUnitId}`);
		return;
	}

	stats.shieldGranted += payload.shieldDelta;
	console.log(`[CombatStatsTracker] Unit ${payload.sourceUnitId} granted ${payload.shieldDelta} shield via shield update`);
}

export function handleUnitAction(payload: { unit: Unit }): void {
	if (!isActive || !payload.unit?.id) return;

	const stats = unitStats.get(payload.unit.id);
	if (!stats) {
		console.warn(`[CombatStatsTracker] No stats found for unit ${payload.unit.id}`);
		return;
	}

	stats.actionsPerformed += 1;
	console.log(`[CombatStatsTracker] Unit ${payload.unit.id} performed an action (total: ${stats.actionsPerformed})`);
}


export function initialize(): void {
	isActive = true;
	unitStats.clear();
	combatStartTime = Date.now();

	initializeUnitStats();

	console.log("[CombatStatsTracker] Initialized for new combat");
}

export function trackDamage(sourceUnitId: string, damage: number, damageType: 'normal' | 'poison' = 'normal'): void {
	if (!isActive || damage <= 0) return;

	const stats = unitStats.get(sourceUnitId);
	if (!stats) {
		console.warn(`[CombatStatsTracker] No stats found for unit ${sourceUnitId}`);
		return;
	}

	if (damageType === 'poison') {
		stats.poisonApplied += damage;
	} else {
		stats.damageDealt += damage;
	}

	console.log(`[CombatStatsTracker] Manually tracked ${damage} ${damageType} damage for unit ${sourceUnitId}`);
}

export function trackHealing(sourceUnitId: string, healing: number, healingType: 'direct' | 'regen' = 'direct'): void {
	if (!isActive || healing <= 0) return;

	const stats = unitStats.get(sourceUnitId);
	if (!stats) {
		console.warn(`[CombatStatsTracker] No stats found for unit ${sourceUnitId}`);
		return;
	}

	if (healingType === 'regen') {
		stats.regenApplied += healing;
	} else {
		stats.healingDone += healing;
	}

	console.log(`[CombatStatsTracker] Manually tracked ${healing} ${healingType} healing for unit ${sourceUnitId}`);
}

export function trackShield(sourceUnitId: string, shield: number): void {
	if (!isActive || shield <= 0) return;

	const stats = unitStats.get(sourceUnitId);
	if (!stats) {
		console.warn(`[CombatStatsTracker] No stats found for unit ${sourceUnitId}`);
		return;
	}

	stats.shieldGranted += shield;
	console.log(`[CombatStatsTracker] Manually tracked ${shield} shield for unit ${sourceUnitId}`);
}

export function updateTimeAlive(delta: number): void {
	if (!isActive) return;

	const activeUnits = state.battleData.units.filter(unit =>
		state.battleData.forces.some(force =>
			force.units.some(forceUnit => forceUnit.id === unit.id)
		)
	);

	for (const unit of activeUnits) {
		const stats = unitStats.get(unit.id);
		if (stats) {
			stats.timeAlive += delta;
		}
	}
}

export function getUnitStats(unitId: string): UnitCombatStats | undefined {
	return unitStats.get(unitId);
}

export function getAllStats(): UnitCombatStats[] {
	return Array.from(unitStats.values());
}

export function getForceStats(forceId: string): UnitCombatStats[] {
	return Array.from(unitStats.values()).filter(stats => stats.forceId === forceId);
}

export function getAggregatedForceStats(forceId: string): Omit<UnitCombatStats, 'unitId' | 'unitName'> {
	const forceStats = getForceStats(forceId);

	return forceStats.reduce((aggregate, stats) => ({
		forceId,
		damageDealt: aggregate.damageDealt + stats.damageDealt,
		poisonApplied: aggregate.poisonApplied + stats.poisonApplied,
		healingDone: aggregate.healingDone + stats.healingDone,
		regenApplied: aggregate.regenApplied + stats.regenApplied,
		shieldGranted: aggregate.shieldGranted + stats.shieldGranted,
		actionsPerformed: aggregate.actionsPerformed + stats.actionsPerformed,
		timeAlive: Math.max(aggregate.timeAlive, stats.timeAlive)
	}), {
		forceId,
		damageDealt: 0,
		poisonApplied: 0,
		healingDone: 0,
		regenApplied: 0,
		shieldGranted: 0,
		actionsPerformed: 0,
		timeAlive: 0
	});
}

export function printStatsSummary(): void {
	if (!isActive && unitStats.size === 0) {
		console.log("[CombatStatsTracker] No stats available");
		return;
	}

	console.log("=== COMBAT STATS SUMMARY ===");

	for (const stats of unitStats.values()) {
		const totalDamage = stats.damageDealt + stats.poisonApplied;
		const totalHealing = stats.healingDone + stats.regenApplied;

		console.log(`${stats.unitName || stats.unitId} (${stats.forceId}):`);
		console.log(`  Damage: ${totalDamage} (${stats.damageDealt} direct, ${stats.poisonApplied} poison)`);
		console.log(`  Healing: ${totalHealing} (${stats.healingDone} direct, ${stats.regenApplied} regen)`);
		console.log(`  Shield: ${stats.shieldGranted}`);
		console.log(`  Actions: ${stats.actionsPerformed}`);
		console.log(`  Time Alive: ${Math.round(stats.timeAlive / 1000)}s`);
		console.log("");
	}

	console.log("=== END COMBAT STATS ===");
}

export function stop(): void {
	if (!isActive) return;

	isActive = false;

	const combatDuration = Date.now() - combatStartTime;
	for (const stats of unitStats.values()) {
		if (stats.timeAlive === 0) {
			stats.timeAlive = combatDuration;
		}
	}

	printStatsSummary();

	console.log("[CombatStatsTracker] Stopped and finalized stats");
}

export function getConfig() {
	return {
		isActive,
		trackedUnits: unitStats.size,
		combatDuration: Date.now() - combatStartTime
	};
}

export function reset(): void {
	isActive = false;
	unitStats.clear();
	combatStartTime = 0;
}
