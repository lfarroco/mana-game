import Phaser from "phaser";
import { FORCE_ID_PLAYER, FORCE_ID_CPU, INITIAL_MORALE } from "../../constants/constants";
import { Unit } from "./Unit";
import { GameEvents } from "../../constants/events";

export type Force = {
	id: string;
	name: string;
	color: string;
	gold: number;
	income: number;
	morale: number;
	maxMorale: number;
	shield: number;
	units: Unit[];
	prestige: number,
	winStreak: number,
	lossStreak: number,
	totalRoundsPlayed: number;
	attackMod: number; // Used for damage scaling in combat
	defenseMod: number; // Used for damage scaling in combat
	healMod: number; // Used for healing scaling in combat
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
		shield: 0,
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
export const manipulateForceMorale = (
	targetForce: Force,
	amount: number,
	scene?: Phaser.Scene
): number => {
	let finalAmount = amount;

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

		scene.events.emit(GameEvents.MODIFIER_DELTA_ATTACK, {
			delta: 0.1,
			forceId: targetForce.id
		});

	}

	return actualChange;
};

/**
 * Utility function to manipulate force shield with shield change events
 * Shield can exceed morale - morale is just used as the scale for display
 */
export const manipulateForceShield = (
	targetForce: Force,
	amount: number,
	scene?: Phaser.Scene
): number => {
	const oldShield = targetForce.shield;
	if (amount > 0) {
		// Shield can grow beyond morale value
		targetForce.shield = targetForce.shield + amount;
	} else {
		targetForce.shield = Math.max(0, targetForce.shield + amount);
	}
	const actualChange = targetForce.shield - oldShield;

	// Emit shield update event if scene is provided
	if (scene && actualChange !== 0) {
		scene.events.emit(GameEvents.SHIELD_UPDATED, {
			forceId: targetForce.id,
			newShield: targetForce.shield,
			maxShield: targetForce.morale, // maxShield for display = current morale
		});
	}

	return actualChange;
};

/**
 * Utility function to apply damage to a force, reducing shield first, then morale
 * Returns the actual damage applied to morale after shield absorption
 */
export const applyDamageToForce = (
	targetForce: Force,
	damage: number,
	scene?: Phaser.Scene
): number => {
	if (damage <= 0) return 0;

	let remainingDamage = damage;

	// Shield absorbs damage first
	if (targetForce.shield > 0) {
		const shieldAbsorbed = Math.min(remainingDamage, targetForce.shield);
		manipulateForceShield(targetForce, -shieldAbsorbed, scene);
		remainingDamage -= shieldAbsorbed;
	}

	// Apply remaining damage to morale
	if (remainingDamage > 0) {
		const moraleChange = manipulateForceMorale(targetForce, -remainingDamage, scene);
		return Math.abs(moraleChange);
	}

	return 0;
};
