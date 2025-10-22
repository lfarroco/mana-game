import * as constants from "../../constants/constants";
import { Unit } from "./Unit";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import * as MoraleDisplay from "@Scenes/Battleground/MoraleDisplay";
import * as BoardStatsDisplay from "@Scenes/Battleground/BoardStatsDisplay";

export type Force = {
	id: string;
	name: string;
	color: string;
	morale: number;
	maxMorale: number;
	shield: number;
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
		morale: constants.INITIAL_MORALE,
		maxMorale: constants.INITIAL_MORALE,
		shield: 0,
		prestige: 20,
		round: 1,
		wins: 0,
	}
};

export const playerForce = makeForce(constants.FORCE_ID_PLAYER);
export const cpuForce = makeForce(constants.FORCE_ID_CPU);

export const manipulateForceMorale = (
	targetForce: Force,
	amount: number,
	emitEvents: boolean = true,
): number => {
	let finalAmount = amount;

	const oldMorale = targetForce.morale;
	if (finalAmount > 0) {
		targetForce.morale = Math.min(targetForce.maxMorale, targetForce.morale + finalAmount);
	} else {
		targetForce.morale = Math.max(0, targetForce.morale + finalAmount);
	}
	const actualChange = targetForce.morale - oldMorale;

	if (emitEvents && actualChange !== 0) {
		MoraleDisplay.updateMoraleDisplay({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
		})
		BoardStatsDisplay.updateStats(targetForce.id);
	}

	return actualChange;
};

export const manipulateForceShield = (
	targetForce: Force,
	amount: number,
	emitEvents: boolean = true,
): number => {
	const oldShield = targetForce.shield;
	if (amount > 0) {
		targetForce.shield = targetForce.shield + amount;
	} else {
		targetForce.shield = Math.max(0, targetForce.shield + amount);
	}
	const actualChange = targetForce.shield - oldShield;

	if (emitEvents && actualChange !== 0) {
		MoraleDisplay.handleShieldUpdated({
			forceId: targetForce.id,
			newShield: targetForce.shield,
			maxShield: targetForce.maxMorale,
		});
		BoardStatsDisplay.updateStats(targetForce.id);
	}

	return actualChange;
};

export const applyDamageToForce = (
	targetForce: Force,
	damage: number,
	shieldPiercingPercentage: number = 0,
	damageType?: "poison" | "normal" | "timeout"
): number => {
	if (damage <= 0) return 0;

	let remainingDamage = damage;
	const originalShield = targetForce.shield;
	const originalMorale = targetForce.morale;

	if (damageType === "poison") {
		const moraleChange = manipulateForceMorale(targetForce, -damage, false);

		// Single UI/event emission with aggregated info
		MoraleDisplay.updateMoraleDisplay({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
			totalDamage: damage,
			damageType: damageType,
		});

		CombatStatsTracker.trackMoraleChange({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
			totalDamage: damage,
			damageType: damageType,
		});

		return Math.abs(moraleChange);
	}

	let effectiveShield = targetForce.shield;
	if (shieldPiercingPercentage > 0 && targetForce.shield > 0) {
		const piercedShield = Math.floor(targetForce.shield * (shieldPiercingPercentage / 100));
		effectiveShield = Math.max(0, targetForce.shield - piercedShield);
	}

	if (effectiveShield > 0) {
		const shieldAbsorbed = Math.min(remainingDamage, effectiveShield);
		manipulateForceShield(targetForce, -shieldAbsorbed, false);
		remainingDamage -= shieldAbsorbed;
	}

	let moraleChange = 0;
	if (remainingDamage > 0) {
		moraleChange = manipulateForceMorale(targetForce, -remainingDamage, false);
	}

	if (targetForce.shield !== originalShield) {
		MoraleDisplay.handleShieldUpdated({
			forceId: targetForce.id,
			newShield: targetForce.shield,
			maxShield: targetForce.maxMorale,
			suppressPopText: targetForce.morale !== originalMorale,
			totalDamage: targetForce.morale === originalMorale ? damage : undefined,
			damageType: damageType,
		});
	}

	if (targetForce.morale !== originalMorale) {
		MoraleDisplay.updateMoraleDisplay({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
			totalDamage: damage,
			damageType: damageType,
		});
		CombatStatsTracker.trackMoraleChange({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
			totalDamage: damage,
			damageType: damageType,
		})
	}

	return Math.abs(moraleChange);
};
