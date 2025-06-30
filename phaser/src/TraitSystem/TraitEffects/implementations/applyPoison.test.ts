/**
 * @file Tests for the apply poison to enemies implementation.
 */

import { applyPoisonToEnemiesPure } from './applyPoison';
import { Unit } from '../../../Models/Entities/Unit';

describe('applyPoisonToEnemiesPure', () => {
	const mockTargets: Unit[] = [
		{ id: 'enemy-1' } as unknown as Unit,
		{ id: 'enemy-2' } as unknown as Unit,
		{ id: 'enemy-3' } as unknown as Unit
	];

	it('should calculate correct poison effect for multiple targets', () => {
		const result = applyPoisonToEnemiesPure(3, 5000, 1000, mockTargets);

		expect(result).toEqual({
			damagePerTick: 3,
			duration: 5000,
			tickInterval: 1000,
			targetCount: 3,
			totalTicks: 5, // 5000ms / 1000ms = 5 ticks
			totalDamagePerTarget: 15, // 5 ticks * 3 damage = 15 total damage
			calculations: [
				{ unitId: 'enemy-1', damagePerTick: 3, duration: 5000, tickInterval: 1000, estimatedTotalDamage: 15 },
				{ unitId: 'enemy-2', damagePerTick: 3, duration: 5000, tickInterval: 1000, estimatedTotalDamage: 15 },
				{ unitId: 'enemy-3', damagePerTick: 3, duration: 5000, tickInterval: 1000, estimatedTotalDamage: 15 }
			]
		});
	});

	it('should handle zero damage per tick', () => {
		const result = applyPoisonToEnemiesPure(0, 3000, 500, mockTargets);

		expect(result.damagePerTick).toBe(0);
		expect(result.totalDamagePerTarget).toBe(0);
		expect(result.calculations.every(calc => calc.damagePerTick === 0)).toBe(true);
		expect(result.calculations.every(calc => calc.estimatedTotalDamage === 0)).toBe(true);
	});

	it('should ensure non-negative damage per tick', () => {
		const result = applyPoisonToEnemiesPure(-5, 2000, 400, mockTargets);

		expect(result.damagePerTick).toBe(0); // Should clamp negative damage to 0
		expect(result.totalDamagePerTarget).toBe(0);
		expect(result.calculations.every(calc => calc.damagePerTick === 0)).toBe(true);
	});

	it('should ensure non-negative duration', () => {
		const result = applyPoisonToEnemiesPure(4, -1000, 500, mockTargets);

		expect(result.duration).toBe(0); // Should clamp negative duration to 0
		expect(result.totalTicks).toBe(0);
		expect(result.totalDamagePerTarget).toBe(0);
	});

	it('should enforce minimum tick interval', () => {
		const result = applyPoisonToEnemiesPure(2, 1000, 50, mockTargets); // Try 50ms interval

		expect(result.tickInterval).toBe(100); // Should clamp to minimum 100ms
		expect(result.totalTicks).toBe(10); // 1000ms / 100ms = 10 ticks
		expect(result.totalDamagePerTarget).toBe(20); // 10 ticks * 2 damage = 20
	});

	it('should handle empty target array', () => {
		const result = applyPoisonToEnemiesPure(5, 3000, 750, []);

		expect(result).toEqual({
			damagePerTick: 5,
			duration: 3000,
			tickInterval: 750,
			targetCount: 0,
			totalTicks: 4, // 3000ms / 750ms = 4 ticks
			totalDamagePerTarget: 20, // 4 ticks * 5 damage = 20
			calculations: []
		});
	});

	it('should handle single target', () => {
		const singleTarget = [mockTargets[0]];
		const result = applyPoisonToEnemiesPure(6, 4000, 800, singleTarget);

		expect(result).toEqual({
			damagePerTick: 6,
			duration: 4000,
			tickInterval: 800,
			targetCount: 1,
			totalTicks: 5, // 4000ms / 800ms = 5 ticks
			totalDamagePerTarget: 30, // 5 ticks * 6 damage = 30
			calculations: [
				{ unitId: 'enemy-1', damagePerTick: 6, duration: 4000, tickInterval: 800, estimatedTotalDamage: 30 }
			]
		});
	});

	it('should calculate correct tick counts for different intervals', () => {
		const testCases = [
			{ duration: 5000, tickInterval: 1000, expectedTicks: 5 },
			{ duration: 3000, tickInterval: 500, expectedTicks: 6 },
			{ duration: 2500, tickInterval: 750, expectedTicks: 3 }, // 2500 / 750 = 3.33... -> 3
			{ duration: 1000, tickInterval: 300, expectedTicks: 3 }, // 1000 / 300 = 3.33... -> 3
			{ duration: 500, tickInterval: 1000, expectedTicks: 0 }  // Duration less than interval
		];

		testCases.forEach(({ duration, tickInterval, expectedTicks }) => {
			const result = applyPoisonToEnemiesPure(1, duration, tickInterval, mockTargets);
			expect(result.totalTicks).toBe(expectedTicks);
			expect(result.totalDamagePerTarget).toBe(expectedTicks * 1);
		});
	});

	it('should handle large damage and duration values', () => {
		const result = applyPoisonToEnemiesPure(100, 60000, 2000, mockTargets);

		expect(result.totalTicks).toBe(30); // 60000ms / 2000ms = 30 ticks
		expect(result.totalDamagePerTarget).toBe(3000); // 30 ticks * 100 damage = 3000
		expect(result.calculations.every(calc => calc.estimatedTotalDamage === 3000)).toBe(true);
	});

	it('should maintain correct unit IDs with different targets', () => {
		const differentTargets: Unit[] = [
			{ id: 'poison-target-1' } as unknown as Unit,
			{ id: 'poison-target-2' } as unknown as Unit
		];

		const result = applyPoisonToEnemiesPure(4, 2000, 500, differentTargets);

		expect(result.calculations).toEqual([
			{ unitId: 'poison-target-1', damagePerTick: 4, duration: 2000, tickInterval: 500, estimatedTotalDamage: 16 },
			{ unitId: 'poison-target-2', damagePerTick: 4, duration: 2000, tickInterval: 500, estimatedTotalDamage: 16 }
		]);
		expect(result.targetCount).toBe(2);
	});

	it('should handle zero duration', () => {
		const result = applyPoisonToEnemiesPure(10, 0, 1000, mockTargets);

		expect(result.duration).toBe(0);
		expect(result.totalTicks).toBe(0);
		expect(result.totalDamagePerTarget).toBe(0);
		expect(result.calculations.every(calc => calc.duration === 0)).toBe(true);
		expect(result.calculations.every(calc => calc.estimatedTotalDamage === 0)).toBe(true);
	});

	it('should handle fractional tick calculations correctly', () => {
		// Test case where duration doesn't divide evenly by tick interval
		const result = applyPoisonToEnemiesPure(7, 3300, 1000, mockTargets);

		expect(result.totalTicks).toBe(3); // Math.floor(3300 / 1000) = 3
		expect(result.totalDamagePerTarget).toBe(21); // 3 ticks * 7 damage = 21
	});
});
