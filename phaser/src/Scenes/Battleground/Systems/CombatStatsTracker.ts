import { scene } from "../BattlegroundScene";
import { Unit } from "../../../Models/Entities/Unit";

/**
 * Represents the combat statistics for a single unit
 */
export type UnitCombatStats = {
	unitId: string;
	unitName?: string;
	forceId: string;

	// Damage statistics
	damageDealt: number;      // Total direct damage dealt
	poisonApplied: number;    // Total poison damage applied (over time)

	// Healing statistics
	healingDone: number;      // Total direct healing done
	regenApplied: number;     // Total regen healing applied (over time)

	// Shield statistics
	shieldGranted: number;    // Total shield points granted to allies

	// Additional tracking
	actionsPerformed: number; // Number of actions/abilities used
	timeAlive: number;        // Total time unit was active in combat (ms)
};

// Singleton state
let isActive: boolean = false;
let unitStats: Map<string, UnitCombatStats> = new Map();
let combatStartTime: number = 0;

/**
 * Creates initial stat entries for all units in the battle
 */
function initializeUnitStats(): void {

	const allUnits = scene.state.battleData.units;

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

/**
 * Handles morale updated events to track damage dealt
 */
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

	// Track different types of damage
	if (payload.damageType === "poison") {
		stats.poisonApplied += payload.totalDamage;
	} else {
		stats.damageDealt += payload.totalDamage;
	}

	console.log(`[CombatStatsTracker] Unit ${sourceUnitId} dealt ${payload.totalDamage} ${payload.damageType || "normal"} damage`);
}

/**
 * Handles morale restored events to track healing done
 */
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

	// Track different types of healing
	if (payload.type === 'regen') {
		stats.regenApplied += payload.amount;
	} else {
		stats.healingDone += payload.amount;
	}

	console.log(`[CombatStatsTracker] Unit ${sourceUnitId} provided ${payload.amount} ${payload.type || "direct"} healing`);
}

/**
 * Handles shield gained events to track shield applications
 */
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

/**
 * Handles shield updated events (alternative way to track shield changes)
 */
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

/**
 * Handles unit action events to track activity
 */
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


/**
 * Initializes the combat stats tracker for a new combat.
 * Sets up event listeners and creates initial stats for all units.
 */
export function initialize(): void {
	isActive = true;
	unitStats.clear();
	combatStartTime = Date.now();

	// Initialize stats for all active units
	initializeUnitStats();

	console.log("[CombatStatsTracker] Initialized for new combat");
}

/**
 * Manually track damage dealt by a specific unit
 * Used when systems need to directly report damage attribution
 */
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

/**
 * Manually track healing done by a specific unit
 */
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

/**
 * Manually track shield granted by a specific unit
 */
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

/**
 * Updates time alive for all active units
 * Should be called periodically during combat
 */
export function updateTimeAlive(delta: number): void {
	if (!isActive) return;

	// Get currently active units
	const activeUnits = scene.state.battleData.units.filter(unit =>
		scene!.state.battleData.forces.some(force =>
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

/**
 * Gets combat stats for a specific unit
 */
export function getUnitStats(unitId: string): UnitCombatStats | undefined {
	return unitStats.get(unitId);
}

/**
 * Gets combat stats for all units
 */
export function getAllStats(): UnitCombatStats[] {
	return Array.from(unitStats.values());
}

/**
 * Gets combat stats for units in a specific force
 */
export function getForceStats(forceId: string): UnitCombatStats[] {
	return Array.from(unitStats.values()).filter(stats => stats.forceId === forceId);
}

/**
 * Gets aggregated stats for a force (sum of all unit stats)
 */
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
		timeAlive: Math.max(aggregate.timeAlive, stats.timeAlive) // Use max time for force
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

/**
 * Prints a summary of combat stats to console
 */
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

/**
 * Stops the combat stats tracker and finalizes time alive calculations
 */
export function stop(): void {
	if (!isActive) return;

	isActive = false;

	// Finalize time alive for all units
	const combatDuration = Date.now() - combatStartTime;
	for (const stats of unitStats.values()) {
		// If unit doesn't have time alive tracked, assume it was alive for full combat
		if (stats.timeAlive === 0) {
			stats.timeAlive = combatDuration;
		}
	}

	// Print final stats summary
	printStatsSummary();

	console.log("[CombatStatsTracker] Stopped and finalized stats");
}

/**
 * Gets the current tracker configuration
 */
export function getConfig() {
	return {
		isActive,
		trackedUnits: unitStats.size,
		combatDuration: Date.now() - combatStartTime
	};
}

/**
 * Resets the tracker state - useful for testing
 * @internal
 */
export function reset(): void {
	isActive = false;
	unitStats.clear();
	combatStartTime = 0;
}
