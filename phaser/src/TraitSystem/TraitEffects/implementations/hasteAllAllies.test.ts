/**
 * @file Tests for the haste all allies implementation.
 */

import { hasteAllAlliesPure } from './hasteAllAllies';
import { Unit } from '../../../Models/Entities/Unit';

describe('hasteAllAlliesPure', () => {
	const mockTargets: Unit[] = [
		{ id: 'ally-1' } as unknown as Unit,
		{ id: 'ally-2' } as unknown as Unit,
		{ id: 'ally-3' } as unknown as Unit
	];

	it('should calculate correct haste effect for multiple targets', () => {
		const result = hasteAllAlliesPure(2500, mockTargets, 0.5);

		expect(result).toEqual({
			duration: 2500,
			multiplier: 0.5,
			targetCount: 3,
			calculations: [
				{ unitId: 'ally-1', duration: 2500, cooldownMultiplier: 0.5 },
				{ unitId: 'ally-2', duration: 2500, cooldownMultiplier: 0.5 },
				{ unitId: 'ally-3', duration: 2500, cooldownMultiplier: 0.5 }
			]
		});
	});

	it('should use default multiplier when not provided', () => {
		const result = hasteAllAlliesPure(3000, mockTargets);

		expect(result.multiplier).toBe(0.5);
		expect(result.calculations.every(calc => calc.cooldownMultiplier === 0.5)).toBe(true);
	});

	it('should ensure non-negative duration', () => {
		const result = hasteAllAlliesPure(-1000, mockTargets, 0.5);

		expect(result).toEqual({
			duration: 0, // Should clamp negative duration to 0
			multiplier: 0.5,
			targetCount: 3,
			calculations: [
				{ unitId: 'ally-1', duration: 0, cooldownMultiplier: 0.5 },
				{ unitId: 'ally-2', duration: 0, cooldownMultiplier: 0.5 },
				{ unitId: 'ally-3', duration: 0, cooldownMultiplier: 0.5 }
			]
		});
	});

	it('should clamp multiplier to reasonable bounds', () => {
		// Test extremely low multiplier (should clamp to 0.1)
		const resultLow = hasteAllAlliesPure(2000, mockTargets, 0.05);
		expect(resultLow.multiplier).toBe(0.1);
		expect(resultLow.calculations.every(calc => calc.cooldownMultiplier === 0.1)).toBe(true);

		// Test extremely high multiplier (should clamp to 2.0)
		const resultHigh = hasteAllAlliesPure(2000, mockTargets, 5.0);
		expect(resultHigh.multiplier).toBe(2.0);
		expect(resultHigh.calculations.every(calc => calc.cooldownMultiplier === 2.0)).toBe(true);
	});

	it('should handle empty target array', () => {
		const result = hasteAllAlliesPure(4000, [], 0.3);

		expect(result).toEqual({
			duration: 4000,
			multiplier: 0.3,
			targetCount: 0,
			calculations: []
		});
	});

	it('should handle single target', () => {
		const singleTarget = [mockTargets[0]];
		const result = hasteAllAlliesPure(1500, singleTarget, 0.7);

		expect(result).toEqual({
			duration: 1500,
			multiplier: 0.7,
			targetCount: 1,
			calculations: [
				{ unitId: 'ally-1', duration: 1500, cooldownMultiplier: 0.7 }
			]
		});
	});

	it('should handle zero duration', () => {
		const result = hasteAllAlliesPure(0, mockTargets, 0.5);

		expect(result.duration).toBe(0);
		expect(result.calculations.every(calc => calc.duration === 0)).toBe(true);
	});

	it('should handle different multiplier values within bounds', () => {
		const testCases = [
			{ multiplier: 0.1, expected: 0.1 },
			{ multiplier: 0.25, expected: 0.25 },
			{ multiplier: 0.5, expected: 0.5 },
			{ multiplier: 0.75, expected: 0.75 },
			{ multiplier: 1.0, expected: 1.0 },
			{ multiplier: 1.5, expected: 1.5 },
			{ multiplier: 2.0, expected: 2.0 }
		];

		testCases.forEach(({ multiplier, expected }) => {
			const result = hasteAllAlliesPure(2000, mockTargets, multiplier);
			expect(result.multiplier).toBe(expected);
			expect(result.calculations.every(calc => calc.cooldownMultiplier === expected)).toBe(true);
		});
	});

	it('should maintain correct unit IDs with different targets', () => {
		const differentTargets: Unit[] = [
			{ id: 'warrior-1' } as unknown as Unit,
			{ id: 'mage-1' } as unknown as Unit
		];

		const result = hasteAllAlliesPure(3500, differentTargets, 0.4);

		expect(result.calculations).toEqual([
			{ unitId: 'warrior-1', duration: 3500, cooldownMultiplier: 0.4 },
			{ unitId: 'mage-1', duration: 3500, cooldownMultiplier: 0.4 }
		]);
		expect(result.targetCount).toBe(2);
	});

	it('should handle large duration values', () => {
		const result = hasteAllAlliesPure(60000, mockTargets, 0.5);

		expect(result.duration).toBe(60000);
		expect(result.calculations.every(calc => calc.duration === 60000)).toBe(true);
	});
});
