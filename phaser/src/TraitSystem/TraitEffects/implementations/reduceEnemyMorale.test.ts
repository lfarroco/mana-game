/**
 * @file Tests for the reduce enemy morale implementation.
 */

import { reduceEnemyMoralePure } from './reduceEnemyMorale';

describe('reduceEnemyMoralePure', () => {
	const mockForces = [
		{ id: 'player-force' },
		{ id: 'enemy-force' }
	];

	it('should return correct values for basic enemy morale reduction', () => {
		const result = reduceEnemyMoralePure(75, 'player-force', mockForces);

		expect(result).toEqual({
			amount: 75,
			enemyForceId: 'enemy-force'
		});
	});

	it('should find the correct enemy force when source is enemy', () => {
		const result = reduceEnemyMoralePure(50, 'enemy-force', mockForces);

		expect(result).toEqual({
			amount: 50,
			enemyForceId: 'player-force'
		});
	});

	it('should ensure morale reduction is positive', () => {
		const result = reduceEnemyMoralePure(-25, 'player-force', mockForces);

		expect(result).toEqual({
			amount: 0, // Should clamp negative values to 0
			enemyForceId: 'enemy-force'
		});
	});

	it('should handle zero morale reduction', () => {
		const result = reduceEnemyMoralePure(0, 'player-force', mockForces);

		expect(result).toEqual({
			amount: 0,
			enemyForceId: 'enemy-force'
		});
	});

	it('should return null enemy force ID when no enemy found', () => {
		const singleForce = [{ id: 'player-force' }];
		const result = reduceEnemyMoralePure(100, 'player-force', singleForce);

		expect(result).toEqual({
			amount: 100,
			enemyForceId: null
		});
	});

	it('should handle multiple forces and find the correct enemy', () => {
		const multipleForces = [
			{ id: 'player-force' },
			{ id: 'ai-force-1' },
			{ id: 'ai-force-2' }
		];

		const result = reduceEnemyMoralePure(60, 'player-force', multipleForces);

		expect(result.amount).toBe(60);
		expect(result.enemyForceId).toBe('ai-force-1'); // Should find the first non-matching force
	});

	it('should handle large morale reduction values', () => {
		const result = reduceEnemyMoralePure(1000, 'player-force', mockForces);

		expect(result).toEqual({
			amount: 1000,
			enemyForceId: 'enemy-force'
		});
	});
});
