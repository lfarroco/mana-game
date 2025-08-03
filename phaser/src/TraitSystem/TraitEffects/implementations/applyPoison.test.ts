/**
 * @file Test for Apply Poison trait effect pure functions
 * Tests the poison calculation and logic using pure functions without Phaser dependencies.
 */

import { Unit } from '../../../Models/Entities/Unit';
import { createTestUnit } from '../../../Models/Entities/Unit';
import { vec2 } from '../../../Models/Geometry.pure';
import { Force, makeForce } from '../../../Models/Entities/Force';
import {
	calculatePoisonAmount,
	calculatePoisonTotalDamage,
	resolvePoisonParams,
	findTargetForce,
	createPoisonApplicationData
} from './applyPoison.pure';

describe('Apply Poison Pure Functions', () => {
	let mockUnit: Unit;
	let mockPlayerForce: Force;
	let mockEnemyForce: Force;
	let mockEffectInstance: any;
	let mockTraitInstanceParams: any;

	beforeEach(() => {
		// Create mock units using pure utility function
		mockUnit = createTestUnit('source-unit-1', 'player', vec2(0, 0)) as Unit;
		mockUnit.power = 15; // Set unit power for poison calculation
		mockUnit.force = 'player';

		mockPlayerForce = makeForce('player');
		mockEnemyForce = makeForce('enemy');

		// Create mock effect instance data
		mockEffectInstance = {
			effectId: 'applyPoison',
			eventTrigger: 'onAttackByMe',
			targetSelector: 'enemy_force',
			amount: undefined // Will use unit power as default
		};

		// Create mock trait instance params
		mockTraitInstanceParams = {
			traitId: 'poisonous',
			level: 1
		};
	});

	describe('calculatePoisonAmount', () => {
		it('should calculate poison amount for typical power values', () => {
			expect(calculatePoisonAmount(1)).toBe(1);
			expect(calculatePoisonAmount(3)).toBe(2);
			expect(calculatePoisonAmount(6)).toBe(3);
			expect(calculatePoisonAmount(10)).toBe(4);
			expect(calculatePoisonAmount(15)).toBe(5);
			expect(calculatePoisonAmount(21)).toBe(6);
		});

		it('should always return at least 1', () => {
			expect(calculatePoisonAmount(0)).toBe(1);
			expect(calculatePoisonAmount(-5)).toBe(1);
		});

		it('should handle large power values', () => {
			expect(calculatePoisonAmount(100)).toBe(14);
			expect(calculatePoisonAmount(1000)).toBe(45);
		});

		it('should be deterministic', () => {
			const power = 15;
			const result1 = calculatePoisonAmount(power);
			const result2 = calculatePoisonAmount(power);
			expect(result1).toBe(result2);
		});
	});

	describe('calculatePoisonTotalDamage', () => {
		it('should calculate total damage correctly', () => {
			expect(calculatePoisonTotalDamage(1)).toBe(1); // 1
			expect(calculatePoisonTotalDamage(2)).toBe(3); // 2 + 1
			expect(calculatePoisonTotalDamage(3)).toBe(6); // 3 + 2 + 1
			expect(calculatePoisonTotalDamage(4)).toBe(10); // 4 + 3 + 2 + 1
			expect(calculatePoisonTotalDamage(5)).toBe(15); // 5 + 4 + 3 + 2 + 1
		});

		it('should handle zero and negative values', () => {
			expect(calculatePoisonTotalDamage(0)).toBe(0);
			expect(calculatePoisonTotalDamage(-1)).toBe(0);
		});

		it('should work with large values', () => {
			expect(calculatePoisonTotalDamage(10)).toBe(55);
			expect(calculatePoisonTotalDamage(20)).toBe(210);
		});
	});

	describe('resolvePoisonParams', () => {
		it('should use unit power as default when no amount specified', () => {
			const result = resolvePoisonParams(mockTraitInstanceParams, mockEffectInstance, mockUnit);

			expect(result.basePower).toBe(15); // mockUnit.power
			expect(result.poisonAmount).toBe(5); // calculated from power 15
			expect(result.totalDamage).toBe(15); // 5+4+3+2+1 = 15
		});

		it('should use effect instance amount when specified', () => {
			const effectWithAmount = { ...mockEffectInstance, amount: 20 };
			const result = resolvePoisonParams(mockTraitInstanceParams, effectWithAmount, mockUnit);

			expect(result.basePower).toBe(20);
			expect(result.poisonAmount).toBe(6); // calculated from power 20
			expect(result.totalDamage).toBe(21); // 6+5+4+3+2+1 = 21
		});

		it('should use trait instance amount when effect instance has no amount', () => {
			const traitWithAmount = { ...mockTraitInstanceParams, amount: 10 };
			const result = resolvePoisonParams(traitWithAmount, mockEffectInstance, mockUnit);

			expect(result.basePower).toBe(10);
			expect(result.poisonAmount).toBe(4); // calculated from power 10
			expect(result.totalDamage).toBe(10); // 4+3+2+1 = 10
		});

		it('should prioritize effect instance over trait instance', () => {
			const traitWithAmount = { ...mockTraitInstanceParams, amount: 10 };
			const effectWithAmount = { ...mockEffectInstance, amount: 20 };
			const result = resolvePoisonParams(traitWithAmount, effectWithAmount, mockUnit);

			expect(result.basePower).toBe(20); // Effect instance takes precedence
		});

		it('should work with different unit power values', () => {
			const highPowerUnit = { ...mockUnit, power: 50 };
			const result = resolvePoisonParams(mockTraitInstanceParams, mockEffectInstance, highPowerUnit);

			expect(result.basePower).toBe(50);
			expect(result.poisonAmount).toBe(10); // calculated from power 50
			expect(result.totalDamage).toBe(55); // 10+9+8+7+6+5+4+3+2+1 = 55
		}); it('should ensure poison amount captures unit power at application time', () => {
			// This is the key test - poison should use unit power when applied, not when damage is dealt
			const unitAtApplicationTime = { ...mockUnit, power: 25 };
			const result = resolvePoisonParams(mockTraitInstanceParams, mockEffectInstance, unitAtApplicationTime);

			expect(result.basePower).toBe(25); // Uses unit power at application time
			expect(result.poisonAmount).toBe(7); // calculated from power 25

			// Even if unit power changes later, poison amount should remain based on application-time power
			unitAtApplicationTime.power = 100; // Simulate power increase after poison application
			const resultAfterPowerChange = resolvePoisonParams(mockTraitInstanceParams, mockEffectInstance, unitAtApplicationTime);

			// New poison applications should use the new power
			expect(resultAfterPowerChange.basePower).toBe(100);
			expect(resultAfterPowerChange.poisonAmount).toBe(14);
		});
	});

	describe('findTargetForce', () => {
		it('should find enemy force when source is player', () => {
			const forces = [mockPlayerForce, mockEnemyForce];
			const result = findTargetForce(forces, 'player');

			expect(result).toBe(mockEnemyForce);
		});

		it('should find player force when source is enemy', () => {
			const forces = [mockPlayerForce, mockEnemyForce];
			const result = findTargetForce(forces, 'enemy');

			expect(result).toBe(mockPlayerForce);
		});

		it('should return undefined when no target force exists', () => {
			const forces = [mockPlayerForce];
			const result = findTargetForce(forces, 'player');

			expect(result).toBeUndefined();
		});

		it('should work with multiple forces', () => {
			const neutralForce = makeForce('neutral');
			const forces = [mockPlayerForce, mockEnemyForce, neutralForce];
			const result = findTargetForce(forces, 'player');

			// Should find the first non-player force
			expect(result).toBe(mockEnemyForce);
		});

		it('should handle empty forces array', () => {
			const result = findTargetForce([], 'player');

			expect(result).toBeUndefined();
		});
	});

	describe('createPoisonApplicationData', () => {
		let context: any;

		beforeEach(() => {
			context = {
				sourceUnit: mockUnit,
				effectInstance: mockEffectInstance,
				traitInstanceParams: mockTraitInstanceParams,
				forces: [mockPlayerForce, mockEnemyForce]
			};
		});

		it('should create complete poison application data', () => {
			const result = createPoisonApplicationData(context);

			expect(result.sourceUnit).toBe(mockUnit);
			expect(result.basePower).toBe(15);
			expect(result.poisonAmount).toBe(5);
			expect(result.totalDamage).toBe(15);
			expect(result.targetForce).toBe(mockEnemyForce);
		});

		it('should work with custom effect parameters', () => {
			const customContext = {
				...context,
				effectInstance: { ...mockEffectInstance, amount: 30 }
			};

			const result = createPoisonApplicationData(customContext);

			expect(result.basePower).toBe(30);
			expect(result.poisonAmount).toBe(7);
			expect(result.totalDamage).toBe(28);
		});

		it('should handle missing target force', () => {
			const contextWithNoTarget = {
				...context,
				forces: [mockPlayerForce] // Only player force, no enemy
			};

			const result = createPoisonApplicationData(contextWithNoTarget);

			expect(result.targetForce).toBeUndefined();
		});

		it('should work with enemy source unit', () => {
			const enemyUnit = { ...mockUnit, force: 'enemy' };
			const contextWithEnemySource = {
				...context,
				sourceUnit: enemyUnit
			};

			const result = createPoisonApplicationData(contextWithEnemySource);

			expect(result.targetForce).toBe(mockPlayerForce); // Should target player force
		});

		it('should be pure - no side effects', () => {
			const originalUnit = { ...mockUnit };
			const originalForces = [...context.forces];

			createPoisonApplicationData(context);

			// Verify no mutations occurred
			expect(mockUnit).toEqual(originalUnit);
			expect(context.forces).toEqual(originalForces);
		});

		it('should demonstrate that poison uses unit power at application time', () => {
			// Initial unit power
			const initialPower = 20;
			mockUnit.power = initialPower;

			// Apply poison with initial power
			const result1 = createPoisonApplicationData(context);
			expect(result1.basePower).toBe(initialPower);
			expect(result1.poisonAmount).toBe(6); // calculated from power 20

			// Simulate unit power increase (e.g., from buffs, equipment, etc.)
			mockUnit.power = 40;

			// Apply poison again with increased power
			const result2 = createPoisonApplicationData(context);
			expect(result2.basePower).toBe(40); // Uses new power
			expect(result2.poisonAmount).toBe(9); // calculated from power 40

			// This demonstrates that poison correctly captures unit power at application time
			expect(result1.poisonAmount).not.toBe(result2.poisonAmount);
		});
	});

	describe('Integration - Poison Formula Correctness', () => {
		it('should ensure poison total damage approximates unit power', () => {
			const testCases = [
				{ power: 1, expectedPoison: 1, expectedTotal: 1 },
				{ power: 6, expectedPoison: 3, expectedTotal: 6 },
				{ power: 10, expectedPoison: 4, expectedTotal: 10 },
				{ power: 15, expectedPoison: 5, expectedTotal: 15 },
				{ power: 21, expectedPoison: 6, expectedTotal: 21 },
			];

			testCases.forEach(({ power, expectedPoison, expectedTotal }) => {
				mockUnit.power = power;
				const result = createPoisonApplicationData({
					sourceUnit: mockUnit,
					effectInstance: mockEffectInstance,
					traitInstanceParams: mockTraitInstanceParams,
					forces: [mockPlayerForce, mockEnemyForce]
				});

				expect(result.poisonAmount).toBe(expectedPoison);
				expect(result.totalDamage).toBe(expectedTotal);
				// Total damage should be very close to the unit's power
				expect(Math.abs(result.totalDamage - power)).toBeLessThanOrEqual(1);
			});
		});

		it('should maintain consistent behavior across multiple calls', () => {
			const results = [];
			for (let i = 0; i < 5; i++) {
				results.push(createPoisonApplicationData({
					sourceUnit: mockUnit,
					effectInstance: mockEffectInstance,
					traitInstanceParams: mockTraitInstanceParams,
					forces: [mockPlayerForce, mockEnemyForce]
				}));
			}

			// All results should be identical
			const first = results[0];
			results.forEach(result => {
				expect(result.basePower).toBe(first.basePower);
				expect(result.poisonAmount).toBe(first.poisonAmount);
				expect(result.totalDamage).toBe(first.totalDamage);
			});
		});
	});
});
