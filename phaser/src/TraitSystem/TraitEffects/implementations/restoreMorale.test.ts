/**
 * @file Tests for the restore force morale implementation.
 */

import { restoreForceMoralePure } from './restoreMorale';

describe('restoreForceMoralePure', () => {
	it('should return correct values for basic morale restoration', () => {
		const result = restoreForceMoralePure(50, 'player-force');

		expect(result).toEqual({
			amount: 50,
			forceId: 'player-force'
		});
	});

	it('should ensure morale restoration is positive', () => {
		const result = restoreForceMoralePure(-25, 'enemy-force');

		expect(result).toEqual({
			amount: 0, // Should clamp negative values to 0
			forceId: 'enemy-force'
		});
	});

	it('should handle zero morale restoration', () => {
		const result = restoreForceMoralePure(0, 'neutral-force');

		expect(result).toEqual({
			amount: 0,
			forceId: 'neutral-force'
		});
	});

	it('should handle large morale restoration values', () => {
		const result = restoreForceMoralePure(1000, 'player-force');

		expect(result).toEqual({
			amount: 1000,
			forceId: 'player-force'
		});
	});

	it('should work with different force IDs', () => {
		const testCases = [
			{ amount: 25, forceId: 'force-1' },
			{ amount: 75, forceId: 'force-2' },
			{ amount: 100, forceId: 'special-force' }
		];

		testCases.forEach(({ amount, forceId }) => {
			const result = restoreForceMoralePure(amount, forceId);
			expect(result).toEqual({ amount, forceId });
		});
	});
});
