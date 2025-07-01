/**
 * @file Tests for keyword trait effect implementations
 * Tests the parameter resolution logic used by trait effects.
 */

import { getEffectParams } from '../TraitSystem.pure';

describe('Keyword Trait Effect Implementations', () => {
	describe('Parameter Resolution', () => {
		it('should prioritize effect parameters over trait parameters', () => {
			const traitParams = { amount: 10 };
			const effectParams = { amount: 15, effectId: 'test' };

			const result = getEffectParams(traitParams, effectParams, 'amount', 5);
			expect(result).toBe(15); // Effect params should take priority
		});

		it('should use trait parameters when effect parameters are missing', () => {
			const traitParams = { amount: 10 };
			const effectParams = { effectId: 'test' }; // No amount

			const result = getEffectParams(traitParams, effectParams, 'amount', 5);
			expect(result).toBe(10); // Should use trait params
		});

		it('should use default when both trait and effect parameters are missing', () => {
			const traitParams = {};
			const effectParams = { effectId: 'test' };

			const result = getEffectParams(traitParams, effectParams, 'amount', 5);
			expect(result).toBe(5); // Should use default
		});

		it('should handle complex parameter types correctly', () => {
			const traitParams = {
				condition: 'enemy_killed',
				multiplier: 1.5,
				enabled: true
			};
			const effectParams = { effectId: 'test' };

			expect(getEffectParams(traitParams, effectParams, 'condition', 'default')).toBe('enemy_killed');
			expect(getEffectParams(traitParams, effectParams, 'multiplier', 1.0)).toBe(1.5);
			expect(getEffectParams(traitParams, effectParams, 'enabled', false)).toBe(true);
		});
	});
});