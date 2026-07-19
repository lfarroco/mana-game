import { CombatState, Unit } from "../Models";
import * as Card from "./Card";

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


export const manipulateCoreLife = (
	state: CombatState,
	targetForce: string,
	amount: number,
	_critical = false,
): number => {
	const core = Card.getBattleCore(state)(targetForce);

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

	return actualChange;
};

export const manipulateCoreShield = (
	state: CombatState,
	targetForce: string,
	amount: number,
	_isCritical: boolean,
): number => {
	const core = Card.getBattleCore(state)(targetForce);

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

	return actualChange;
};

export const applyDamageToForce = (
	state: CombatState,
	targetForce: string,
	damage: number,
	shieldPiercingPercentage: number = 0,
	damageType?: "poison" | "normal" | "timeout",
	_critical = false,
): number => {
	if (damage <= 0) return 0;

	const core = Card.getBattleCore(state)(targetForce)!;

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
		);
		remainingDamage -= shieldAbsorbed;
	}

	const lifeChange =
		remainingDamage > 0
			? manipulateCoreLife(state, targetForce, -remainingDamage, false)
			: 0;

	return Math.abs(lifeChange);
};

export const getUnitForce = (state: CombatState, unitId: string): string => {
	return state.units.find((u) => u.id === unitId)!.force;
};

export const getEnemyForce = (state: CombatState, unitId: string): string => {
	const unit = state.units.find((u) => u.id === unitId)!;
	return state.units.find((u) => u.force !== unit.force)!.force;
};