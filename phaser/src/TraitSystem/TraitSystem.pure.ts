/**
 * Pure functions for the Trait System - no side effects, fully testable
 * These functions handle calculations, validations, and data transformations
 * without depending on Phaser, scene objects, or external state mutation.
 */

import { Unit } from "../Models/Entities/Unit";
import { TraitData } from "./Traits";

/**
 * Pure function to resolve effect parameters with fallbacks
 * @param traitInstanceParams - Parameters from the trait instance
 * @param effectInstance - Parameters from the specific effect
 * @param paramName - Name of the parameter to resolve
 * @param defaultValue - Default value if parameter not found
 * @returns The resolved parameter value
 */
export function getEffectParams<T>(
	traitInstanceParams: Record<string, unknown>,
	effectInstance: Record<string, unknown>,
	paramName: string,
	defaultValue: T
): T {
	// Check effect instance first (more specific), then trait instance (general), then default
	if (effectInstance && effectInstance[paramName] !== undefined) {
		return effectInstance[paramName] as T;
	}
	if (traitInstanceParams && traitInstanceParams[paramName] !== undefined) {
		return traitInstanceParams[paramName] as T;
	}
	return defaultValue;
}

/**
 * Pure function to calculate damage amount based on base value and modifiers
 * @param baseAmount - Base damage amount
 * @param sourceUnit - Unit dealing the damage (for stat-based calculations)
 * @param multiplier - Damage multiplier (default 1.0)
 * @param flatBonus - Flat bonus damage (default 0)
 * @returns Calculated final damage amount
 */
export function calculateDamageAmount(
	baseAmount: number,
	sourceUnit: Unit,
	multiplier: number = 1.0,
	flatBonus: number = 0
): number {
	// Could include stat-based calculations like:
	// const statBonus = sourceUnit.attack * 0.1; // 10% of attack stat
	const finalAmount = (baseAmount + flatBonus) * multiplier;
	return Math.max(0, Math.floor(finalAmount)); // Ensure non-negative, integer damage
}

/**
 * Pure function to calculate healing amount based on base value and modifiers
 * @param baseAmount - Base healing amount
 * @param sourceUnit - Unit doing the healing (for stat-based calculations)
 * @param multiplier - Healing multiplier (default 1.0)
 * @param flatBonus - Flat bonus healing (default 0)
 * @returns Calculated final healing amount
 */
export function calculateHealingAmount(
	baseAmount: number,
	sourceUnit: Unit,
	multiplier: number = 1.0,
	flatBonus: number = 0
): number {
	// Could include stat-based calculations like:
	// const statBonus = sourceUnit.wisdom * 0.15; // 15% of wisdom stat
	const finalAmount = (baseAmount + flatBonus) * multiplier;
	return Math.max(0, Math.floor(finalAmount)); // Ensure non-negative, integer healing
}

/**
 * Pure function to validate if a unit can be targeted by an effect
 * @param sourceUnit - Unit casting the effect
 * @param targetUnit - Unit being targeted
 * @param requiresAlive - Whether target must be alive (default true)
 * @param requiresSameForce - Whether target must be same force as source (default false)
 * @param requiresDifferentForce - Whether target must be different force from source (default false)
 * @returns Whether the target is valid
 */
export function isValidTarget(
	sourceUnit: Unit,
	targetUnit: Unit,
	requiresAlive: boolean = true,
	requiresSameForce: boolean = false,
	requiresDifferentForce: boolean = false
): boolean {
	// Check if target is alive when required
	if (requiresAlive && targetUnit.hp <= 0) {
		return false;
	}

	// Check force requirements
	if (requiresSameForce && sourceUnit.force !== targetUnit.force) {
		return false;
	}

	if (requiresDifferentForce && sourceUnit.force === targetUnit.force) {
		return false;
	}

	// Cannot target self unless specifically allowed
	if (sourceUnit.id === targetUnit.id) {
		return !requiresDifferentForce; // Self-targeting allowed for same-force effects
	}

	return true;
}

/**
 * Pure function to filter units based on targeting criteria
 * @param sourceUnit - Unit casting the effect
 * @param candidateUnits - Array of potential target units
 * @param targetingOptions - Options for filtering targets
 * @returns Array of valid target units
 */
export function filterValidTargets(
	sourceUnit: Unit,
	candidateUnits: Unit[],
	targetingOptions: {
		requiresAlive?: boolean;
		requiresSameForce?: boolean;
		requiresDifferentForce?: boolean;
		maxTargets?: number;
		excludeSelf?: boolean;
	} = {}
): Unit[] {
	const {
		requiresAlive = true,
		requiresSameForce = false,
		requiresDifferentForce = false,
		maxTargets,
		excludeSelf = false
	} = targetingOptions;

	let validTargets = candidateUnits.filter(unit => {
		// Exclude self if required
		if (excludeSelf && unit.id === sourceUnit.id) {
			return false;
		}

		return isValidTarget(sourceUnit, unit, requiresAlive, requiresSameForce, requiresDifferentForce);
	});

	// Limit number of targets if specified
	if (maxTargets !== undefined && maxTargets > 0) {
		validTargets = validTargets.slice(0, maxTargets);
	}

	return validTargets;
}

/**
 * Pure function to calculate effect duration with modifiers
 * @param baseDuration - Base duration in milliseconds or frames
 * @param sourceUnit - Unit casting the effect (for stat-based modifications)
 * @param durationMultiplier - Duration multiplier (default 1.0)
 * @param flatDurationBonus - Flat duration bonus (default 0)
 * @returns Calculated final duration
 */
export function calculateEffectDuration(
	baseDuration: number,
	sourceUnit: Unit,
	durationMultiplier: number = 1.0,
	flatDurationBonus: number = 0
): number {
	const finalDuration = (baseDuration + flatDurationBonus) * durationMultiplier;
	return Math.max(1, Math.floor(finalDuration)); // Ensure at least 1 frame/ms duration
}

/**
 * Pure function to check if a trait has a specific effect type
 * @param traitData - The trait instance data
 * @param effectId - The effect ID to check for
 * @param traitDefinition - The trait definition (contains effects array)
 * @returns Whether the trait has the specified effect
 */
export function traitHasEffect(
	traitData: TraitData,
	effectId: string,
	traitDefinition: { effects: Array<{ effectId: string }> }
): boolean {
	return traitDefinition.effects.some(effect => effect.effectId === effectId);
}

/**
 * Pure function to calculate gold reward amount with modifiers
 * @param baseGold - Base gold amount
 * @param sourceUnit - Unit generating the gold (for stat-based bonuses)
 * @param goldMultiplier - Gold multiplier (default 1.0)
 * @param flatGoldBonus - Flat gold bonus (default 0)
 * @returns Calculated final gold amount
 */
export function calculateGoldReward(
	baseGold: number,
	sourceUnit: Unit,
	goldMultiplier: number = 1.0,
	flatGoldBonus: number = 0
): number {
	const finalGold = (baseGold + flatGoldBonus) * goldMultiplier;
	return Math.max(0, Math.floor(finalGold)); // Ensure non-negative, integer gold
}

/**
 * Pure function to validate trait effect parameters
 * @param traitInstanceParams - Parameters from trait instance
 * @param effectInstance - Parameters from effect instance
 * @param requiredParams - Array of required parameter names
 * @returns Object with validation result and missing parameters
 */
export function validateEffectParameters(
	traitInstanceParams: Record<string, unknown>,
	effectInstance: Record<string, unknown>,
	requiredParams: string[]
): {
	isValid: boolean;
	missingParams: string[];
} {
	const missingParams: string[] = [];

	for (const param of requiredParams) {
		const hasInEffect = effectInstance && effectInstance[param] !== undefined;
		const hasInTrait = traitInstanceParams && traitInstanceParams[param] !== undefined;

		if (!hasInEffect && !hasInTrait) {
			missingParams.push(param);
		}
	}

	return {
		isValid: missingParams.length === 0,
		missingParams
	};
}
