import * as constants from "@Constants/constants";
import { Unit } from "./Unit";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { getCore } from "./Card";
import { updatePowerDisplay } from "@Systems/Chara/CharaStatsDisplay";

export type Force = {
	id: string;
	name: string;
	color: string;
	units: Unit[];
	prestige: number,
	round: number;
	wins: number;
};

export const makeForce = (id: string): Force => {
	return {
		id,
		name: "",
		color: "",
		units: [],
		prestige: 20,
		round: 1,
		wins: 0,
	}
};

export const playerForce = makeForce(constants.FORCE_ID_PLAYER);
export const cpuForce = makeForce(constants.FORCE_ID_CPU);

export const manipulateCorePower = (
	targetForce: Force,
	amount: number,
): number => {
	let finalAmount = amount;

	const core = getCore(targetForce.id);

	const oldPower = core.power;
	if (finalAmount > 0) {
		core.power = Math.min(core.maxPower, core.power + finalAmount);
	} else {
		core.power = Math.max(0, core.power + finalAmount);
	}
	const actualChange = core.power - oldPower;

	updatePowerDisplay(core.id)

	return actualChange;
};

export const manipulateCoreShield = (
	targetForce: Force,
	amount: number,
): number => {

	const core = getCore(targetForce.id);

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
	targetForce: Force,
	damage: number,
	shieldPiercingPercentage: number = 0,
	damageType?: "poison" | "normal" | "timeout"
): number => {
	if (damage <= 0) return 0;

	const core = getCore(targetForce.id);

	let remainingDamage = damage;
	const originalMorale = core.power;

	if (damageType === "poison") {
		const moraleChange = manipulateCorePower(targetForce, -damage);

		CombatStatsTracker.trackMoraleChange({
			forceId: targetForce.id,
			newMorale: core.power,
			maxMorale: core.maxPower,
			totalDamage: damage,
			damageType: damageType,
		});

		return Math.abs(moraleChange);
	}

	let effectiveShield = core.shield;
	if (shieldPiercingPercentage > 0 && core.shield > 0) {
		const piercedShield = Math.floor(core.shield * (shieldPiercingPercentage / 100));
		effectiveShield = Math.max(0, core.shield - piercedShield);
	}

	if (effectiveShield > 0) {
		const shieldAbsorbed = Math.min(remainingDamage, effectiveShield);
		manipulateCoreShield(targetForce, -shieldAbsorbed);
		remainingDamage -= shieldAbsorbed;
	}

	let moraleChange = 0;
	if (remainingDamage > 0) {
		moraleChange = manipulateCorePower(targetForce, -remainingDamage);
	}

	if (core.power !== originalMorale) {
		CombatStatsTracker.trackMoraleChange({
			forceId: targetForce.id,
			newMorale: core.power,
			maxMorale: core.maxPower,
			totalDamage: damage,
			damageType: damageType,
		})
	}

	return Math.abs(moraleChange);
};

export const getUnitForce = (unitId: string) => {
	const unit = state.battleData.units.find(u => u.id === unitId)!
	return state.battleData.forces.find(f => f.id === unit.force)!
}

export const getEnemyForce = (unitId: string) => {
	const unit = state.battleData.units.find(u => u.id === unitId)!
	return state.battleData.forces.find(f => f.id !== unit.force)!
}