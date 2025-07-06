import Phaser from "phaser";
import { FORCE_ID_PLAYER, FORCE_ID_CPU, INITIAL_MORALE } from "../../constants/constants";
import { Unit, MoraleReductionStack } from "./Unit";
import { GameEvents } from "../../constants/events";
import { devlog } from "../../utils";

export type Force = {
	id: string;
	name: string;
	color: string;
	gold: number;
	income: number;
	morale: number;
	maxMorale: number;
	units: Unit[];
	prestige: number,
	winStreak: number,
	lossStreak: number,
	totalRoundsPlayed: number;
	attackMod: number; // Used for damage scaling in combat
	defenseMod: number; // Used for damage scaling in combat
	healMod: number; // Used for healing scaling in combat

	// Defensive trait effects
	moraleReductionStacks?: MoraleReductionStack[];
};

export const makeForce = (id: string): Force => {
	return {
		id,
		name: "",
		color: "",
		gold: 10,
		income: 5,
		units: [],
		morale: INITIAL_MORALE,
		maxMorale: INITIAL_MORALE,
		prestige: 0,
		winStreak: 0,
		lossStreak: 0,
		totalRoundsPlayed: 0,
		attackMod: 1.0, // Default attack modifier
		defenseMod: 1.0, // Default defense modifier
		healMod: 1.0, // Default heal modifier
	}
};

export const playerForce = makeForce(FORCE_ID_PLAYER);
export const cpuForce = makeForce(FORCE_ID_CPU);

export const updatePlayerGoldIO = (scene: Phaser.Scene, goldDelta: number) => {
	// Ensure goldDelta is an integer for consistent calculations
	const changeAmount = Math.floor(goldDelta);
	playerForce.gold += changeAmount;

	// Emit an event with the new total gold and the delta amount
	// The UIManager will listen to this to update text and play animations
	scene.events.emit(GameEvents.GOLD_CHANGED, playerForce.gold, changeAmount);
}

/**
 * Utility function to manipulate force morale with morale damage reduction effects
 */
export const manipulateForceMoreale = (
	targetForce: Force,
	amount: number,
	scene?: Phaser.Scene
): number => {
	let finalAmount = amount;

	// Apply morale damage reduction if this is a negative morale change (damage)
	if (amount < 0 && targetForce.moraleReductionStacks) {
		const reductionStacks = targetForce.moraleReductionStacks;
		let totalReduction = 0;

		// Sum all active reductions (multiple units can provide protection)
		for (const stack of reductionStacks) {
			// Check if the unit is still alive
			const protectorUnit = targetForce.units.find(u => u.id === stack.unitId);
			if (protectorUnit && protectorUnit.hp > 0) {
				totalReduction += stack.reductionPercent;
			}
		}

		// Cap total reduction at 50% to prevent making forces invulnerable
		totalReduction = Math.min(totalReduction, 50);

		if (totalReduction > 0) {
			const originalAmount = Math.abs(amount);
			const reducedAmount = originalAmount * (1 - totalReduction / 100);
			finalAmount = -reducedAmount;

			const moraleProtected = originalAmount - reducedAmount;
			devlog(`[Morale Guardian] Protected ${moraleProtected.toFixed(1)} morale (${totalReduction}% reduction)`);
		}
	}

	const oldMorale = targetForce.morale;
	if (finalAmount > 0) {
		targetForce.morale = Math.min(targetForce.maxMorale, targetForce.morale + finalAmount);
	} else {
		targetForce.morale = Math.max(0, targetForce.morale + finalAmount);
	}
	const actualChange = targetForce.morale - oldMorale;

	// Emit morale update event if scene is provided
	if (scene && actualChange !== 0) {
		scene.events.emit(GameEvents.MORALE_UPDATED, {
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
		});
	}

	return actualChange;
};
