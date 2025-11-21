import * as constants from "@Constants/constants";
import { Unit } from "./Unit";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { getCore } from "./Card";
import * as ForceStats from "@Scenes/Battleground/ForceStats";
import { getState } from "@Models/State";

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

export const playerForce = makeForce(constants.FORCE_ID_PLAYER);
export const cpuForce = makeForce(constants.FORCE_ID_CPU);

export const manipulateCoreLife = (
	targetForce: Force,
	amount: number,
	_critical = false
): number => {
	const core = getCore(targetForce.id);

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
	targetForce: Force,
	amount: number,
	_isCritical: boolean,
	displayFeedback: boolean = true
): number => {
	const core = getCore(targetForce.id);

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
	targetForce: Force,
	damage: number,
	shieldPiercingPercentage: number = 0,
	damageType?: "poison" | "normal" | "timeout",
	_critical = false
): number => {
	if (damage <= 0) return 0;

	const core = getCore(targetForce.id);

	let remainingDamage = damage;
	const originalLife = core.life;

	if (damageType === "poison") {
		const lifeChage = manipulateCoreLife(targetForce, -damage);

		CombatStatsTracker.trackLifeChange({
			forceId: targetForce.id,
			newLife: core.life,
			maxLife: core.maxLife,
			totalDamage: damage,
			damageType: damageType,
		});

		return Math.abs(lifeChage);
	}

	let effectiveShield = core.shield;
	if (shieldPiercingPercentage > 0 && core.shield > 0) {
		const piercedShield = Math.floor(core.shield * (shieldPiercingPercentage / 100));
		effectiveShield = Math.max(0, core.shield - piercedShield);
	}

	if (effectiveShield > 0) {
		const shieldAbsorbed = Math.min(remainingDamage, effectiveShield);
		manipulateCoreShield(targetForce, -shieldAbsorbed, false, false);
		remainingDamage -= shieldAbsorbed;
	}

	const lifeChange = remainingDamage > 0 ? manipulateCoreLife(targetForce, -remainingDamage) : 0;

	if (core.life !== originalLife) {
		CombatStatsTracker.trackLifeChange({
			forceId: targetForce.id,
			newLife: core.life,
			maxLife: core.maxLife,
			totalDamage: damage,
			damageType: damageType,
		});
	}

	return Math.abs(lifeChange);
};

export const getUnitForce = (unitId: string) => {
	const state = getState();
	const unit = state.battleData.units.find((u) => u.id === unitId)!;
	return state.battleData.forces.find((f) => f.id === unit.force)!;
};

export const getEnemyForce = (unitId: string) => {
	const state = getState();
	const unit = state.battleData.units.find((u) => u.id === unitId)!;
	return state.battleData.forces.find((f) => f.id !== unit.force)!;
};
