/**
 * @file Tests for core keyword trait implementations
 * Tests fundamental game traits like melee, ranged, sniper, healing, etc.
 * These are the most critical traits that form the backbone of combat.
 * Uses pure function approach to test trait logic without Phaser dependencies.
 */

import { getEffectParams } from '../TraitSystem.pure';
import { Unit } from '../../Models/Entities/Unit';
import { vec2 } from '../../Models/Geometry.pure';

// Helper function to create mock units with all required properties
function createMockUnit(id: string, overrides: Partial<Unit> = {}): Unit {
	return {
		id,
		cardId: 'test-card',
		name: 'Test Unit',
		pic: 'test.png',
		force: 'player-force',
		hp: 100,
		maxHp: 100,
		power: 20,
		cooldown: 1000,
		position: vec2(1, 2),
		traits: [],
		attackType: 'damage',
		crit: 0,
		evade: 0,
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		...overrides
	} as Unit;
}

describe('Core Keyword Trait Parameter Resolution', () => {
	let mockUnit: Unit;

	beforeEach(() => {
		mockUnit = createMockUnit('test-unit-1');
	});

	describe('Melee Trait Parameters', () => {
		it('should resolve damage parameters correctly', () => {
			const traitParams = { damage: 25 };
			const effectParams = { effectId: 'skill_melee', eventTrigger: 'onAction' };

			const damage = getEffectParams(traitParams, effectParams, 'damage', mockUnit.power);
			expect(damage).toBe(25); // From trait params

			const defaultDamage = getEffectParams({}, effectParams, 'damage', mockUnit.power);
			expect(defaultDamage).toBe(mockUnit.power); // Default to unit power
		});

		it('should handle melee units with different attack types', () => {
			const armorUnit = createMockUnit('armor-unit', { attackType: 'armor' });
			const healUnit = createMockUnit('heal-unit', { attackType: 'heal' });

			expect(armorUnit.attackType).toBe('armor');
			expect(healUnit.attackType).toBe('heal');
			expect(armorUnit.power).toBeGreaterThan(0);
			expect(healUnit.power).toBeGreaterThan(0);
		});

		it('should support melee range parameters', () => {
			const traitParams = { range: 1 };
			const effectParams = { effectId: 'skill_melee', eventTrigger: 'onAction' };

			const range = getEffectParams(traitParams, effectParams, 'range', 1);
			expect(range).toBe(1);
		});
	});

	describe('Ranged Trait Parameters', () => {
		it('should resolve range parameters correctly', () => {
			const traitParams = { range: 5 };
			const effectParams = { effectId: 'skill_shoot', eventTrigger: 'onAction' };

			const range = getEffectParams(traitParams, effectParams, 'range', 3);
			expect(range).toBe(5); // Custom range from trait params

			const defaultRange = getEffectParams({}, effectParams, 'range', 3);
			expect(defaultRange).toBe(3); // Default range
		});

		it('should support projectile count for multi-shot', () => {
			const traitParams = { projectiles: 3 };
			const effectParams = { effectId: 'skill_arcane_missiles', eventTrigger: 'onAction' };

			const projectiles = getEffectParams(traitParams, effectParams, 'projectiles', 1);
			expect(projectiles).toBe(3);
		});

		it('should handle ranged accuracy parameters', () => {
			const traitParams = { accuracy: 0.9 };
			const effectParams = { effectId: 'skill_shoot', eventTrigger: 'onAction' };

			const accuracy = getEffectParams(traitParams, effectParams, 'accuracy', 1.0);
			expect(accuracy).toBe(0.9);
		});
	});

	describe('Sniper Trait Parameters', () => {
		it('should resolve attack bonus correctly', () => {
			const traitParams = { amount: 15 };
			const effectParams = { effectId: 'trait_sniper', eventTrigger: 'onBattleStart' };

			const attackBonus = getEffectParams(traitParams, effectParams, 'amount', 10);
			expect(attackBonus).toBe(15); // Custom bonus

			const defaultBonus = getEffectParams({}, effectParams, 'amount', 10);
			expect(defaultBonus).toBe(10); // Default sniper bonus
		});

		it('should validate positional logic for back row detection', () => {
			const backRowUnit = createMockUnit('back-row', { position: vec2(1, 2) });
			const frontRowUnit = createMockUnit('front-row', { position: vec2(1, 0) });
			const midRowUnit = createMockUnit('mid-row', { position: vec2(1, 1) });

			const boardHeightInTiles = 3;

			// Back row should be y >= 2 for a 3-tile high board
			expect(backRowUnit.position.y >= (boardHeightInTiles - 1)).toBe(true);
			expect(frontRowUnit.position.y >= (boardHeightInTiles - 1)).toBe(false);
			expect(midRowUnit.position.y >= (boardHeightInTiles - 1)).toBe(false);
		});

		it('should support conditional bonuses', () => {
			const traitParams = {
				amount: 12,
				row_requirement: 'back',
				bonus_type: 'multiplicative'
			};
			const effectParams = { effectId: 'trait_sniper', eventTrigger: 'onBattleStart' };

			const amount = getEffectParams(traitParams, effectParams, 'amount', 10);
			const rowReq = getEffectParams(traitParams, effectParams, 'row_requirement', 'back');
			const bonusType = getEffectParams(traitParams, effectParams, 'bonus_type', 'additive');

			expect(amount).toBe(12);
			expect(rowReq).toBe('back');
			expect(bonusType).toBe('multiplicative');
		});
	});

	describe('Healing Trait Parameters', () => {
		it('should resolve healing amounts correctly', () => {
			const healingUnit = createMockUnit('healer', { attackType: 'heal', power: 25 });
			const traitParams = { amount: 30 };
			const effectParams = { effectId: 'skill_heal', eventTrigger: 'onAction' };

			const healAmount = getEffectParams(traitParams, effectParams, 'amount', healingUnit.power);
			expect(healAmount).toBe(30); // Custom heal amount

			const defaultHeal = getEffectParams({}, effectParams, 'amount', healingUnit.power);
			expect(defaultHeal).toBe(healingUnit.power); // Default to unit power
		});

		it('should support healing wave parameters', () => {
			const traitParams = {
				maxTargets: 4,
				range: 6,
				prioritize: 'lowest_hp'
			};
			const effectParams = { effectId: 'skill_healing_wave', eventTrigger: 'onAction' };

			const maxTargets = getEffectParams(traitParams, effectParams, 'maxTargets', 3);
			const range = getEffectParams(traitParams, effectParams, 'range', 5);
			const prioritize = getEffectParams(traitParams, effectParams, 'prioritize', 'closest');

			expect(maxTargets).toBe(4);
			expect(range).toBe(6);
			expect(prioritize).toBe('lowest_hp');
		});

		it('should handle heal over time parameters', () => {
			const traitParams = {
				duration: 5000,
				tickAmount: 5,
				tickInterval: 1000
			};
			const effectParams = { effectId: 'apply_heal_over_time', eventTrigger: 'onAction' };

			const duration = getEffectParams(traitParams, effectParams, 'duration', 3000);
			const tickAmount = getEffectParams(traitParams, effectParams, 'tickAmount', 3);
			const tickInterval = getEffectParams(traitParams, effectParams, 'tickInterval', 500);

			expect(duration).toBe(5000);
			expect(tickAmount).toBe(5);
			expect(tickInterval).toBe(1000);
		});
	});

	describe('Utility Trait Parameters', () => {
		describe('Plunder trait', () => {
			it('should resolve gold generation amounts', () => {
				const traitParams = { amount: 3 };
				const effectParams = { effectId: 'grant_gold_to_player', eventTrigger: 'onAttackByMe' };

				const goldAmount = getEffectParams(traitParams, effectParams, 'amount', 1);
				expect(goldAmount).toBe(3); // Custom gold amount

				const defaultGold = getEffectParams({}, effectParams, 'amount', 1);
				expect(defaultGold).toBe(1); // Default gold per attack
			});

			it('should support conditional gold generation', () => {
				const traitParams = {
					amount: 2,
					condition: 'enemy_killed',
					bonus_amount: 5
				};
				const effectParams = {
					effectId: 'grant_gold_to_player',
					eventTrigger: 'onEnemyDeath',
					amount: 3 // Effect override
				};

				const amount = getEffectParams(traitParams, effectParams, 'amount', 1);
				const condition = getEffectParams(traitParams, effectParams, 'condition', 'on_attack');
				const bonusAmount = getEffectParams(traitParams, effectParams, 'bonus_amount', 0);

				expect(amount).toBe(3); // Effect params take priority
				expect(condition).toBe('enemy_killed');
				expect(bonusAmount).toBe(5);
			});
		});

		describe('Taunt trait', () => {
			it('should resolve taunt range and priority', () => {
				const traitParams = {
					range: 2,
					priority: 'high',
					force_target: true
				};
				const effectParams = { effectId: 'apply_taunt', eventTrigger: 'onBattleStart' };

				const range = getEffectParams(traitParams, effectParams, 'range', 1);
				const priority = getEffectParams(traitParams, effectParams, 'priority', 'normal');
				const forceTarget = getEffectParams(traitParams, effectParams, 'force_target', false);

				expect(range).toBe(2);
				expect(priority).toBe('high');
				expect(forceTarget).toBe(true);
			});
		});
	});

	describe('Stat Modification Parameters', () => {
		it('should resolve stat modification amounts and attributes', () => {
			const traitParams = {
				attribute: 'power',
				amount: 8,
				duration: 'permanent'
			};
			const effectParams = {
				effectId: 'modify_stat_passive',
				eventTrigger: 'onBattleStart',
				amount: 10 // Effect override
			};

			const attribute = getEffectParams(traitParams, effectParams, 'attribute', 'hp');
			const amount = getEffectParams(traitParams, effectParams, 'amount', 0);
			const duration = getEffectParams(traitParams, effectParams, 'duration', 'temporary');

			expect(attribute).toBe('power');
			expect(amount).toBe(10); // Effect params take priority
			expect(duration).toBe('permanent');
		});

		it('should handle percentage-based modifications', () => {
			const traitParams = {
				attribute: 'cooldown',
				percent: -20, // 20% cooldown reduction
				modifier_type: 'percentage'
			};
			const effectParams = { effectId: 'modify_stat_passive', eventTrigger: 'onBattleStart' };

			const percent = getEffectParams(traitParams, effectParams, 'percent', 0);
			const modifierType = getEffectParams(traitParams, effectParams, 'modifier_type', 'flat');

			expect(percent).toBe(-20);
			expect(modifierType).toBe('percentage');
		});
	});

	describe('Positional Trait Parameters', () => {
		it('should resolve positional bonus requirements', () => {
			const frontRowTraitParams = {
				attribute: 'power',
				amount: 10,
				row: 'front'
			};
			const backRowTraitParams = {
				attribute: 'maxHp',
				amount: 50,
				row: 'back'
			};
			const effectParams = { effectId: 'positional_bonus', eventTrigger: 'onBattleStart' };

			// Front row bonus
			const frontAttribute = getEffectParams(frontRowTraitParams, effectParams, 'attribute', 'power');
			const frontAmount = getEffectParams(frontRowTraitParams, effectParams, 'amount', 0);
			const frontRow = getEffectParams(frontRowTraitParams, effectParams, 'row', 'any');

			expect(frontAttribute).toBe('power');
			expect(frontAmount).toBe(10);
			expect(frontRow).toBe('front');

			// Back row bonus
			const backAttribute = getEffectParams(backRowTraitParams, effectParams, 'attribute', 'power');
			const backAmount = getEffectParams(backRowTraitParams, effectParams, 'amount', 0);
			const backRow = getEffectParams(backRowTraitParams, effectParams, 'row', 'any');

			expect(backAttribute).toBe('maxHp');
			expect(backAmount).toBe(50);
			expect(backRow).toBe('back');
		});

		it('should support column-based bonuses', () => {
			const traitParams = {
				attribute: 'crit',
				amount: 15,
				column: 'center',
				adjacency_bonus: 5
			};
			const effectParams = { effectId: 'positional_bonus', eventTrigger: 'onBattleStart' };

			const column = getEffectParams(traitParams, effectParams, 'column', 'any');
			const adjacencyBonus = getEffectParams(traitParams, effectParams, 'adjacency_bonus', 0);

			expect(column).toBe('center');
			expect(adjacencyBonus).toBe(5);
		});
	});

	describe('Complex Parameter Resolution', () => {
		it('should handle cascading parameter priorities correctly', () => {
			const traitParams = {
				damage: 15,
				range: 4,
				cooldown: 1500,
				accuracy: 0.85
			};
			const effectParams = {
				effectId: 'skill_shoot',
				eventTrigger: 'onAction',
				damage: 20, // Should override trait param
				duration: 3000 // Effect-only param
			};

			// Effect params should take priority over trait params
			const damage = getEffectParams(traitParams, effectParams, 'damage', 10);
			expect(damage).toBe(20);

			// Trait params should be used when effect doesn't have them
			const range = getEffectParams(traitParams, effectParams, 'range', 2);
			expect(range).toBe(4);

			const cooldown = getEffectParams(traitParams, effectParams, 'cooldown', 1000);
			expect(cooldown).toBe(1500);

			const accuracy = getEffectParams(traitParams, effectParams, 'accuracy', 1.0);
			expect(accuracy).toBe(0.85);

			// Effect-only params should work
			const duration = getEffectParams(traitParams, effectParams, 'duration', 2000);
			expect(duration).toBe(3000);

			// Default values should be used when neither has the param
			const missing = getEffectParams(traitParams, effectParams, 'missing_param', 100);
			expect(missing).toBe(100);
		});

		it('should handle null and undefined parameters gracefully', () => {
			const traitParams = { validParam: 42 };
			const effectParams = { effectId: 'test', eventTrigger: 'onAction' };

			// Should use default when parameter is undefined
			const undefinedParam = getEffectParams(traitParams, effectParams, 'undefinedParam', 999);
			expect(undefinedParam).toBe(999);

			// Should handle null trait params
			const nullTraitResult = getEffectParams(null as any, effectParams, 'validParam', 123);
			expect(nullTraitResult).toBe(123);

			// Should handle null effect params
			const nullEffectResult = getEffectParams(traitParams, null as any, 'validParam', 456);
			expect(nullEffectResult).toBe(42); // Should still get trait param
		});

		it('should preserve parameter types correctly', () => {
			const traitParams = {
				stringParam: 'test_string',
				numberParam: 42,
				booleanParam: true,
				arrayParam: [1, 2, 3]
			};
			const effectParams = { effectId: 'test', eventTrigger: 'onAction' };

			const stringResult = getEffectParams(traitParams, effectParams, 'stringParam', 'default');
			const numberResult = getEffectParams(traitParams, effectParams, 'numberParam', 0);
			const booleanResult = getEffectParams(traitParams, effectParams, 'booleanParam', false);
			const arrayResult = getEffectParams(traitParams, effectParams, 'arrayParam', []);

			expect(typeof stringResult).toBe('string');
			expect(typeof numberResult).toBe('number');
			expect(typeof booleanResult).toBe('boolean');
			expect(Array.isArray(arrayResult)).toBe(true);

			expect(stringResult).toBe('test_string');
			expect(numberResult).toBe(42);
			expect(booleanResult).toBe(true);
			expect(arrayResult).toEqual([1, 2, 3]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle zero and negative values correctly', () => {
			const traitParams = {
				zeroParam: 0,
				negativeParam: -10,
				smallParam: 0.001
			};
			const effectParams = { effectId: 'test', eventTrigger: 'onAction' };

			const zeroResult = getEffectParams(traitParams, effectParams, 'zeroParam', 100);
			const negativeResult = getEffectParams(traitParams, effectParams, 'negativeParam', 5);
			const smallResult = getEffectParams(traitParams, effectParams, 'smallParam', 1.0);

			expect(zeroResult).toBe(0);
			expect(negativeResult).toBe(-10);
			expect(smallResult).toBe(0.001);
		});

		it('should handle very large numbers', () => {
			const traitParams = {
				largeParam: 999999999,
				scientificParam: 1e6
			};
			const effectParams = { effectId: 'test', eventTrigger: 'onAction' };

			const largeResult = getEffectParams(traitParams, effectParams, 'largeParam', 100);
			const scientificResult = getEffectParams(traitParams, effectParams, 'scientificParam', 1000);

			expect(largeResult).toBe(999999999);
			expect(scientificResult).toBe(1000000);
		});

		it('should handle string-number conversions appropriately', () => {
			const traitParams = {
				stringNumber: '42',
				stringText: 'not_a_number'
			};
			const effectParams = { effectId: 'test', eventTrigger: 'onAction' };

			// getEffectParams should return the value as-is without conversion
			const stringNumberResult = getEffectParams(traitParams, effectParams, 'stringNumber', 0);
			const stringTextResult = getEffectParams(traitParams, effectParams, 'stringText', 'default');

			expect(stringNumberResult).toBe('42'); // Returned as string
			expect(stringTextResult).toBe('not_a_number');
		});
	});
});
