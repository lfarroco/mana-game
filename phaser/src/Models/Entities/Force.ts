import { Unit } from "./Unit";
import { getBattleCore } from "./Card";
import * as ForceStats from "@Scenes/Battleground/ForceStats";
import { State } from "@Models/State";

export type Force = {
	id: string;
	name: string;
	color: string;
	units: Unit[];
	lives: number;
	wins: number;
};

export const makeForce = (id: string): Force => {
	return {
		id,
		name: "",
		color: "",
		units: [],
		lives: 4,
		wins: 0,
	};
};

export const playerForce = (state: State): Force => {
	return state.gameData.player;
};

export const cpuForce = (state: State): Force => {
	return state.battleData.forces.find((f) => f.id !== state.gameData.player.id)!;
};

export const manipulateCoreLife = (
	state: State,
	targetForce: Force,
	amount: number,
	_critical = false
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

	ForceStats.updateLifeDisplay(targetForce.id, core.life, amount);

	return actualChange;
};

export const manipulateCoreShield = (
	state: State,
	targetForce: Force,
	amount: number,
	_isCritical: boolean,
	displayFeedback: boolean = true
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

	ForceStats.updateShieldDisplay(
		targetForce.id,
		core.shield,
		displayFeedback ? actualChange : 0
	);

	return actualChange;
};

export const applyDamageToForce = (
	state: State,
	targetForce: Force,
	damage: number,
	shieldPiercingPercentage: number = 0,
	damageType?: "poison" | "normal" | "timeout",
	_critical = false
): number => {
	if (damage <= 0) return 0;

	const core = getBattleCore(state)(targetForce.id);

	// If core life is 0, it cannot be damaged
	if (core.life <= 0) {
		return 0;
	}

	let remainingDamage = damage;

	if (damageType === "poison") {
		const lifeChage = manipulateCoreLife(state, targetForce, -damage);

		return Math.abs(lifeChage);
	}

	let effectiveShield = core.shield;
	if (shieldPiercingPercentage > 0 && core.shield > 0) {
		const piercedShield = Math.floor(core.shield * (shieldPiercingPercentage / 100));
		effectiveShield = Math.max(0, core.shield - piercedShield);
	}

	if (effectiveShield > 0) {
		const shieldAbsorbed = Math.min(remainingDamage, effectiveShield);
		manipulateCoreShield(state, targetForce, -shieldAbsorbed, false, false);
		remainingDamage -= shieldAbsorbed;
	}

	const lifeChange = remainingDamage > 0 ? manipulateCoreLife(state, targetForce, -remainingDamage) : 0;

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
