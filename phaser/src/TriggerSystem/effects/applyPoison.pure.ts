/**
 * @file Pure functions for Apply Poison trait effect
 * These functions handle poison calculation and logic without depending on Phaser or scene objects.
 */

import { Unit } from '../../Models/Entities/Unit';
import { Force } from '../../Models/Entities/Force';

/**
 * Pure function to calculate poison amount based on unit power
 * Uses a balanced formula to ensure poison deals approximately the same total damage as the unit's power
 * 
 * @param basePower - The base power to use for poison calculation (usually unit.power)
 * @returns The initial poison amount to apply
 */
export function calculatePoisonAmount(basePower: number): number {
	// Handle edge cases
	if (basePower <= 0) {
		return 1;
	}

	// Calculate balanced poison initial amount using the formula:
	// For total damage = basePower, initial amount A = (-1 + √(1 + 8 * basePower)) / 2
	// This ensures poison deals approximately the same total damage as the unit's power
	const discriminant = 1 + 8 * basePower;
	if (discriminant < 0) {
		return 1;
	}

	// Use the quadratic formula to find the poison amount that gives us target total damage
	const baseAmount = (-1 + Math.sqrt(discriminant)) / 2;

	// Apply a slight scaling to ensure we hit closer to the target
	// The pure mathematical formula sometimes rounds in ways that reduce total damage
	const scalingFactor = 1.02; // Small adjustment to compensate for rounding
	const adjustedAmount = baseAmount * scalingFactor;

	const poisonAmount = Math.max(1, Math.round(adjustedAmount));

	// Verify the result and adjust if needed
	const actualTotal = poisonAmount * (poisonAmount + 1) / 2;
	const targetTotal = basePower;

	// If we're significantly under target (more than 15% off), try the next higher amount
	if (actualTotal < targetTotal * 0.85 && poisonAmount < basePower) {
		return poisonAmount + 1;
	}

	return poisonAmount;
}

/**
 * Pure function to calculate the total damage a poison effect will deal over its lifetime
 * 
 * @param initialAmount - The initial poison amount
 * @returns The total damage the poison will deal
 */
export function calculatePoisonTotalDamage(initialAmount: number): number {
	// Handle edge cases
	if (initialAmount <= 0) {
		return 0;
	}

	// Poison deals damage equal to its current amount, then decreases by 1
	// So total damage = amount + (amount-1) + (amount-2) + ... + 1
	// This is the sum formula: n(n+1)/2
	return Math.floor(initialAmount * (initialAmount + 1) / 2);
}

/**
 * Pure function to resolve poison parameters from effect and trait instances
 * Now always uses the unit's current power for dynamic scaling.
 * 
 * @param _traitInstanceParams - Parameters from the trait instance (unused, kept for API compatibility)
 * @param _effectInstance - Parameters from the specific effect (unused, kept for API compatibility)
 * @param sourceUnit - The unit applying the poison (for current power)
 * @returns The resolved poison amount and base power used
 */
export function resolvePoisonParams(
	_traitInstanceParams: Record<string, unknown>,
	_effectInstance: Record<string, unknown>,
	sourceUnit: Unit
): {
	basePower: number;
	poisonAmount: number;
	totalDamage: number;
} {
	// Always use the unit's current power for poison calculation
	// This ensures poison damage scales with unit power increases
	const basePower = sourceUnit.power;

	const poisonAmount = calculatePoisonAmount(basePower);
	const totalDamage = calculatePoisonTotalDamage(poisonAmount);

	return {
		basePower,
		poisonAmount,
		totalDamage
	};
}

/**
 * Pure function to find the target force (opposite force from source unit)
 * 
 * @param forces - Array of all forces in the battle
 * @param sourceUnitForce - The force ID of the unit applying poison
 * @returns The target force, or undefined if not found
 */
export function findTargetForce(forces: Force[], sourceUnitForce: string): Force | undefined {
	return forces.find(force => force.id !== sourceUnitForce);
}

/**
 * Pure function to create poison application data
 * This combines all the pure calculations needed for applying poison
 * 
 * @param context - The context containing source unit, effect params, and battle data
 * @returns Object containing all calculated poison data
 */
export function createPoisonApplicationData(context: {
	sourceUnit: Unit;
	effectInstance: Record<string, unknown>;
	traitInstanceParams: Record<string, unknown>;
	forces: Force[];
}): {
	sourceUnit: Unit;
	basePower: number;
	poisonAmount: number;
	totalDamage: number;
	targetForce: Force | undefined;
} {
	const { sourceUnit, effectInstance, traitInstanceParams, forces } = context;

	const { basePower, poisonAmount, totalDamage } = resolvePoisonParams(
		traitInstanceParams,
		effectInstance,
		sourceUnit
	);

	const targetForce = findTargetForce(forces, sourceUnit.force);

	return {
		sourceUnit,
		basePower,
		poisonAmount,
		totalDamage,
		targetForce
	};
}
