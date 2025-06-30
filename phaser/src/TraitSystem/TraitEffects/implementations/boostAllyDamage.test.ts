/**
 * @file Tests for the boost ally damage implementation.
 */

import { boostAllyDamagePure } from './boostAllyDamage';
import { Unit } from '../../../Models/Entities/Unit';

describe('boostAllyDamagePure', () => {
	const mockTargets: Unit[] = [
		{ id: 'ally-1' } as unknown as Unit,
		{ id: 'ally-2' } as unknown as Unit,
		{ id: 'ally-3' } as unknown as Unit
	];

	it('should calculate correct damage boost for multiple targets', () => {
		const result = boostAllyDamagePure(15, 3000, mockTargets);
		
		expect(result).toEqual({
			amount: 15,
			duration: 3000,
			targetCount: 3,
			calculations: [
				{ unitId: 'ally-1', damageBoost: 15, duration: 3000 },
				{ unitId: 'ally-2', damageBoost: 15, duration: 3000 },
				{ unitId: 'ally-3', damageBoost: 15, duration: 3000 }
			]
		});
	});

	it('should handle zero damage boost', () => {
		const result = boostAllyDamagePure(0, 2000, mockTargets);
		
		expect(result).toEqual({
			amount: 0,
			duration: 2000,
			targetCount: 3,
			calculations: [
				{ unitId: 'ally-1', damageBoost: 0, duration: 2000 },
				{ unitId: 'ally-2', damageBoost: 0, duration: 2000 },
				{ unitId: 'ally-3', damageBoost: 0, duration: 2000 }
			]
		});
	});

	it('should ensure non-negative damage boost', () => {
		const result = boostAllyDamagePure(-10, 1500, mockTargets);
		
		expect(result).toEqual({
			amount: 0, // Should clamp negative values to 0
			duration: 1500,
			targetCount: 3,
			calculations: [
				{ unitId: 'ally-1', damageBoost: 0, duration: 1500 },
				{ unitId: 'ally-2', damageBoost: 0, duration: 1500 },
				{ unitId: 'ally-3', damageBoost: 0, duration: 1500 }
			]
		});
	});

	it('should ensure non-negative duration', () => {
		const result = boostAllyDamagePure(20, -1000, mockTargets);
		
		expect(result).toEqual({
			amount: 20,
			duration: 0, // Should clamp negative duration to 0
			targetCount: 3,
			calculations: [
				{ unitId: 'ally-1', damageBoost: 20, duration: 0 },
				{ unitId: 'ally-2', damageBoost: 20, duration: 0 },
				{ unitId: 'ally-3', damageBoost: 20, duration: 0 }
			]
		});
	});

	it('should handle empty target array', () => {
		const result = boostAllyDamagePure(25, 4000, []);
		
		expect(result).toEqual({
			amount: 25,
			duration: 4000,
			targetCount: 0,
			calculations: []
		});
	});

	it('should handle single target', () => {
		const singleTarget = [mockTargets[0]];
		const result = boostAllyDamagePure(30, 5000, singleTarget);
		
		expect(result).toEqual({
			amount: 30,
			duration: 5000,
			targetCount: 1,
			calculations: [
				{ unitId: 'ally-1', damageBoost: 30, duration: 5000 }
			]
		});
	});

	it('should handle large damage and duration values', () => {
		const result = boostAllyDamagePure(1000, 60000, mockTargets);
		
		expect(result).toEqual({
			amount: 1000,
			duration: 60000,
			targetCount: 3,
			calculations: [
				{ unitId: 'ally-1', damageBoost: 1000, duration: 60000 },
				{ unitId: 'ally-2', damageBoost: 1000, duration: 60000 },
				{ unitId: 'ally-3', damageBoost: 1000, duration: 60000 }
			]
		});
	});

	it('should maintain correct unit IDs with different targets', () => {
		const differentTargets: Unit[] = [
			{ id: 'warrior-1' } as unknown as Unit,
			{ id: 'mage-1' } as unknown as Unit
		];
		
		const result = boostAllyDamagePure(12, 2500, differentTargets);
		
		expect(result.calculations).toEqual([
			{ unitId: 'warrior-1', damageBoost: 12, duration: 2500 },
			{ unitId: 'mage-1', damageBoost: 12, duration: 2500 }
		]);
		expect(result.targetCount).toBe(2);
	});

	it('should handle zero duration', () => {
		const result = boostAllyDamagePure(15, 0, mockTargets);
		
		expect(result.duration).toBe(0);
		expect(result.calculations.every(calc => calc.duration === 0)).toBe(true);
	});
});
