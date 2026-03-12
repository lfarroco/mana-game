import { Unit } from "@Models/Entities/Unit";
import { getBattleCore } from "@Models/Entities/Card";
import { State } from "@Models/State";
import { CombatEffects } from "@Scenes/Battleground/CombatEnvironment";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "@Constants/constants";

export type Force = {
	id: string;
	name: string;
	color: string;
	units: Unit[];
	lives: number;
	wins: number;
	losses: number;
};

export const makeForce = (id: string): Force => {
	return {
		id,
		name: "",
		color: "",
		units: [],
		lives: 4,
		wins: 0,
		losses: 0,
	};
};

export const playerForce = (state: State): Force => {
	return state.battleData.forces.find((f) => f.id === FORCE_ID_PLAYER)!;
};

export const cpuForce = (state: State): Force => {
	return state.battleData.forces.find((f) => f.id === FORCE_ID_CPU)!;
};

// Helper to get forceStatsState from env.effects if accessible, but Force.ts imports CombatEffects which doesn't have reference to Environment context directly unless passed.
// Wait, manipulateCoreLife receives effects: CombatEffects.
// BUT it doesn't receive the environment or combatStates directly.
// And CombatEffects is just functions.
// We should probably change manipulateCoreLife to accept CombatEnvironment?
// Or we assume 'effects' passed to it IS the environment's effects which might be bound?
// No, they are just functions.
// The caller (dealDamage, etc) has access to env.
// So we should pass env.combatStates.forceStatsState to manipulateCoreLife?
// Or just pass 'env' to manipulateCoreLife?
// Passing 'env' is cleaner.

export const manipulateCoreLife = (
	state: State,
	targetForce: Force,
	amount: number,
	_critical = false,
	effects?: CombatEffects,
	forceStatsState?: any // Add optional state
): number => {
	const core = getBattleCore(state)(targetForce.id);

	// If core life is 0, it cannot restore life or take damage
	if (core.life <= 0) {
		return 0;
	}

	const oldLife = core.life;
	if (amount > 0) {
		core.life = Math.min(core.maxLife, core.life + amount);
	} else {
		core.life = Math.max(0, core.life + amount);
	}
	const actualChange = core.life - oldLife;

	if (effects) {
		effects.updateLifeDisplay(targetForce.id, core.life, amount, forceStatsState);
	}

	return actualChange;
};

export const manipulateCoreShield = (
	state: State,
	targetForce: Force,
	amount: number,
	_isCritical: boolean,
	displayFeedback: boolean = true,
	effects?: CombatEffects,
	forceStatsState?: any
): number => {
	const core = getBattleCore(state)(targetForce.id);

	// If core life is 0, it cannot restore shield
	if (core.life <= 0 && amount > 0) {
		return 0;
	}

	const oldShield = core.shield;
	if (amount > 0) {
		core.shield = core.shield + amount;
	} else {
		core.shield = Math.max(0, core.shield + amount);
	}
	const actualChange = core.shield - oldShield;

	if (effects && displayFeedback) {
		effects.updateShieldDisplay(targetForce.id, core.shield, actualChange, forceStatsState);
	}

	return actualChange;
};

export const applyDamageToForce = (
	state: State,
	targetForce: Force,
	damage: number,
	shieldPiercingPercentage: number = 0,
	damageType?: "poison" | "normal" | "timeout",
	_critical = false,
	effects?: CombatEffects,
	forceStatsState?: any
): number => {
	if (damage <= 0) return 0;

	const core = getBattleCore(state)(targetForce.id);

	if (!core) {
		console.warn(`[Force] applyDamageToForce: No core found for force ${targetForce.id}`);
		return 0;
	}

	// If core life is 0, it cannot be damaged
	if (core.life <= 0) {
		return 0;
	}

	let remainingDamage = damage;

	if (damageType === "poison") {
		const lifeChage = manipulateCoreLife(
			state,
			targetForce,
			-damage,
			false,
			effects,
			forceStatsState
		);

		return Math.abs(lifeChage);
	}

	let effectiveShield = core.shield;
	if (shieldPiercingPercentage > 0 && core.shield > 0) {
		const piercedShield = Math.floor(core.shield * (shieldPiercingPercentage / 100));
		effectiveShield = Math.max(0, core.shield - piercedShield);
	}

	if (effectiveShield > 0) {
		const shieldAbsorbed = Math.min(remainingDamage, effectiveShield);
		manipulateCoreShield(
			state,
			targetForce,
			-shieldAbsorbed,
			false,
			true,
			effects,
			forceStatsState
		);
		remainingDamage -= shieldAbsorbed;
	}

	const lifeChange =
		remainingDamage > 0
			? manipulateCoreLife(state, targetForce, -remainingDamage, false, effects, forceStatsState)
			: 0;

	return Math.abs(lifeChange);
};

export const getUnitForce = (state: State, unitId: string) => {
	const unit = state.battleData.units.find((u) => u.id === unitId)!;
	return state.battleData.forces.find((f) => f.id === unit.force)!;
};

export const getEnemyForce = (state: State, unitId: string) => {
	const unit = state.battleData.units.find((u) => u.id === unitId)!;
	return state.battleData.forces.find((f) => f.id !== unit.force)!;
};
