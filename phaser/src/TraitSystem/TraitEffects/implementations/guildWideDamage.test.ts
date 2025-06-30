/**
 * @file Tests for the guild-wide damage implementation.
 */

import { guildWideDamagePure } from './guildWideDamage';
import { Unit } from '../../../Models/Entities/Unit';

describe('guildWideDamagePure', () => {
	const mockTargets: Unit[] = [
		{
			id: 'enemy-1',
		} as unknown as Unit,
		{
			id: 'enemy-2',
		} as unknown as Unit,
		{
			id: 'enemy-3',
		} as unknown as Unit
	];

	it('should calculate correct damage for multiple targets', () => {
		const result = guildWideDamagePure(15, mockTargets);
		
		expect(result).toEqual({
			damage: 15,
			targetCount: 3,
			calculations: [
				{ unitId: 'enemy-1', damage: 15 },
				{ unitId: 'enemy-2', damage: 15 },
				{ unitId: 'enemy-3', damage: 15 }
			]
		});
	});

	it('should handle zero damage', () => {
		const result = guildWideDamagePure(0, mockTargets);
		
		expect(result).toEqual({
			damage: 0,
			targetCount: 3,
			calculations: [
				{ unitId: 'enemy-1', damage: 0 },
				{ unitId: 'enemy-2', damage: 0 },
				{ unitId: 'enemy-3', damage: 0 }
			]
		});
	});

	it('should ensure non-negative damage', () => {
		const result = guildWideDamagePure(-10, mockTargets);
		
		expect(result).toEqual({
			damage: 0, // Should clamp negative values to 0
			targetCount: 3,
			calculations: [
				{ unitId: 'enemy-1', damage: 0 },
				{ unitId: 'enemy-2', damage: 0 },
				{ unitId: 'enemy-3', damage: 0 }
			]
		});
	});

	it('should handle empty target array', () => {
		const result = guildWideDamagePure(25, []);
		
		expect(result).toEqual({
			damage: 25,
			targetCount: 0,
			calculations: []
		});
	});

	it('should handle single target', () => {
		const singleTarget = [mockTargets[0]];
		const result = guildWideDamagePure(50, singleTarget);
		
		expect(result).toEqual({
			damage: 50,
			targetCount: 1,
			calculations: [
				{ unitId: 'enemy-1', damage: 50 }
			]
		});
	});

	it('should handle large damage values', () => {
		const result = guildWideDamagePure(1000, mockTargets);
		
		expect(result).toEqual({
			damage: 1000,
			targetCount: 3,
			calculations: [
				{ unitId: 'enemy-1', damage: 1000 },
				{ unitId: 'enemy-2', damage: 1000 },
				{ unitId: 'enemy-3', damage: 1000 }
			]
		});
	});

	it('should maintain correct unit IDs in calculations', () => {
		const differentTargets: Unit[] = [
			{ id: 'special-enemy-1' } as unknown as Unit,
			{ id: 'special-enemy-2' } as unknown as Unit
		];
		
		const result = guildWideDamagePure(20, differentTargets);
		
		expect(result.calculations).toEqual([
			{ unitId: 'special-enemy-1', damage: 20 },
			{ unitId: 'special-enemy-2', damage: 20 }
		]);
		expect(result.targetCount).toBe(2);
	});
});
