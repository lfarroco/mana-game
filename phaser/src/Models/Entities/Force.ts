import { FORCE_ID_PLAYER, FORCE_ID_CPU, INITIAL_MORALE } from "../../constants/constants";
import { Unit } from "./Unit";
import { ui } from "../../UI/UIManager";
import { trackMoraleChange, } from "../../Scenes/Battleground/Systems/CombatStatsTracker";
import { handleShieldUpdated, updateMoraleDisplay } from "../../Scenes/Battleground/MoraleDisplay";

// A "force" represents a party of heroes (units)
export type Force = {
	id: string;
	name: string;
	color: string;
	gold: number;
	level: number;
	xp: number;
	morale: number;
	maxMorale: number;
	shield: number;
	units: Unit[];
	prestige: number,
	winStreak: number,
	lossStreak: number,
	totalRoundsPlayed: number;
};

export const makeForce = (id: string): Force => {
	return {
		id,
		name: "",
		color: "",
		gold: 10,
		level: 1,
		xp: 0,
		units: [],
		morale: INITIAL_MORALE,
		maxMorale: INITIAL_MORALE,
		shield: 0,
		prestige: 0,
		winStreak: 0,
		lossStreak: 0,
		totalRoundsPlayed: 0,
	}
};

export const playerForce = makeForce(FORCE_ID_PLAYER);
export const cpuForce = makeForce(FORCE_ID_CPU);

export const updatePlayerGoldIO = (goldDelta: number) => {

	const changeAmount = Math.floor(goldDelta);
	playerForce.gold += changeAmount;

	ui.handleGoldChanged(playerForce.gold, changeAmount)
}

/**
 * Utility function to manipulate force morale with morale damage reduction effects
 */
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
		updateMoraleDisplay({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
		})
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
	emitEvents: boolean = true,
): number => {
	const oldShield = targetForce.shield;
	if (amount > 0) {
		// Shield can grow beyond morale value
		targetForce.shield = targetForce.shield + amount;
	} else {
		targetForce.shield = Math.max(0, targetForce.shield + amount);
	}
	const actualChange = targetForce.shield - oldShield;

	if (emitEvents && actualChange !== 0) {
		handleShieldUpdated({
			forceId: targetForce.id,
			newShield: targetForce.shield,
			maxShield: targetForce.maxMorale,
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
	shieldPiercingPercentage: number = 0,
	damageType?: "poison" | "normal" | "timeout"
): number => {
	if (damage <= 0) return 0;

	let remainingDamage = damage;
	const originalShield = targetForce.shield;
	const originalMorale = targetForce.morale;

	// Poison damage bypasses shields entirely
	if (damageType === "poison") {
		// Apply poison damage directly to morale
		const moraleChange = manipulateForceMorale(targetForce, -damage, false); // suppress intermediate event

		// Single UI/event emission with aggregated info
		updateMoraleDisplay({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
			totalDamage: damage, // Show total damage for pop text
			damageType: damageType, // Include damage type for colored pop text
		})

		trackMoraleChange({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
			totalDamage: damage,
			damageType: damageType,
		});

		return Math.abs(moraleChange);
	}

	// For non-poison damage, calculate effective shield after piercing
	let effectiveShield = targetForce.shield;
	if (shieldPiercingPercentage > 0 && targetForce.shield > 0) {
		const piercedShield = Math.floor(targetForce.shield * (shieldPiercingPercentage / 100));
		effectiveShield = Math.max(0, targetForce.shield - piercedShield);
	}

	// Shield absorbs damage first (without emitting events), using effective shield
	if (effectiveShield > 0) {
		const shieldAbsorbed = Math.min(remainingDamage, effectiveShield);
		manipulateForceShield(targetForce, -shieldAbsorbed, false); // suppress intermediate event
		remainingDamage -= shieldAbsorbed;
	}

	// Apply remaining damage to morale (without emitting events)
	let moraleChange = 0;
	if (remainingDamage > 0) {
		moraleChange = manipulateForceMorale(targetForce, -remainingDamage, false); // suppress intermediate event
	}

	// Emit events for both shield and morale updates, but only show pop text for total damage

	// Emit shield update if shield changed
	if (targetForce.shield !== originalShield) {
		// Emit a single shield event with aggregated info
		handleShieldUpdated({
			forceId: targetForce.id,
			newShield: targetForce.shield,
			maxShield: targetForce.maxMorale, // Use max morale as maxShield for display
			suppressPopText: targetForce.morale !== originalMorale, // Only suppress if morale also changed
			totalDamage: targetForce.morale === originalMorale ? damage : undefined, // Show total damage if only shield changed
			damageType: damageType, // Include damage type for colored pop text
		});
	}

	// Emit morale update if morale changed, and show total damage as pop text
	if (targetForce.morale !== originalMorale) {
		updateMoraleDisplay({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
			totalDamage: damage, // Include total damage for pop text display
			damageType: damageType, // Include damage type for colored pop text
		});
		trackMoraleChange({
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
			totalDamage: damage, // Include total damage for pop text display
			damageType: damageType, // Include damage type for colored pop text
		})
	}

	return Math.abs(moraleChange);
};
