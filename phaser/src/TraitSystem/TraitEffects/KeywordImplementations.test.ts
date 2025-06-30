/**
 * @file Tests for keyword trait effect implementations
 * Tests the actual behavior of trait effects used by cards, ensuring they work correctly
 * with proper parameter resolution and effect application.
 * Focuses on the implementations in Implementations.ts that are triggered by card traits.
 */

import { getEffectParams } from '../TraitSystem.pure';
import { Unit } from '../../Models/Entities/Unit';
import { TraitEffectContext } from '../TraitEffectSystem';
import { Force } from '../../Models/Entities/Force';
import { Vec2, vec2 } from '../../Models/Geometry.pure';

// Mock all external dependencies
jest.mock('../../Scenes/Battleground/Systems/CharaManager', () => ({
	getChara: jest.fn()
}));

jest.mock('../../Systems/StatusEffects/StatusEffectManager', () => ({
	applyStatusEffect: jest.fn()
}));

jest.mock('../../utils', () => ({
	pickRandom: jest.fn(),
	devlog: jest.fn()
}));

jest.mock('../../Effects', () => ({
	impactEffect: jest.fn()
}));

jest.mock('../../Models/Entities/Force', () => ({
	playerForce: { id: 'player-force' },
	updatePlayerGoldIO: jest.fn(),
	manipulateForceMoreale: jest.fn()
}));

jest.mock('../../constants/events', () => ({
	GameEvents: {
		MORALE_UPDATED: 'MORALE_UPDATED'
	}
}));

// Import skills that are used by implementations
jest.mock('../../Systems/Chara/Skills/slash', () => ({
	slash: jest.fn()
}));

jest.mock('../../Systems/Chara/Skills/healing', () => ({
	healing: jest.fn()
}));

jest.mock('../../Systems/Chara/Skills/healingWave', () => ({
	healingWave: jest.fn()
}));

jest.mock('../../Systems/Chara/Skills/shoot', () => ({
	shoot: jest.fn()
}));

jest.mock('../../Systems/Chara/Skills/fireball', () => ({
	fireball: jest.fn()
}));

jest.mock('../../Systems/Chara/Skills/arcaneMissiles', () => ({
	arcaneMissiles: jest.fn()
}));

jest.mock('../../Systems/Chara/Skills/haste', () => ({
	haste: jest.fn()
}));

jest.mock('../../Systems/Chara/Skills/slow', () => ({
	slow: jest.fn()
}));

jest.mock('../../Systems/Chara/Skills/summon', () => ({
	summon: jest.fn()
}));

// Import the mocked functions
import { getChara } from '../../Scenes/Battleground/Systems/CharaManager';
import { applyStatusEffect } from '../../Systems/StatusEffects/StatusEffectManager';
// import { pickRandom } from '../../utils'; // Unused
import { updatePlayerGoldIO, manipulateForceMoreale } from '../../Models/Entities/Force';
import { slash } from '../../Systems/Chara/Skills/slash';
import { healing } from '../../Systems/Chara/Skills/healing';
import { healingWave } from '../../Systems/Chara/Skills/healingWave';
import { shoot } from '../../Systems/Chara/Skills/shoot';
import { fireball } from '../../Systems/Chara/Skills/fireball';
import { arcaneMissiles } from '../../Systems/Chara/Skills/arcaneMissiles';
// import { haste } from '../../Systems/Chara/Skills/haste'; // Unused
// import { slow } from '../../Systems/Chara/Skills/slow'; // Unused
import { summon } from '../../Systems/Chara/Skills/summon';

// Cast to mocked functions for better type safety
const mockGetChara = getChara as jest.MockedFunction<typeof getChara>;
const mockApplyStatusEffect = applyStatusEffect as jest.MockedFunction<typeof applyStatusEffect>;
// const mockPickRandom = pickRandom as jest.MockedFunction<typeof pickRandom>; // Unused
const mockUpdatePlayerGoldIO = updatePlayerGoldIO as jest.MockedFunction<typeof updatePlayerGoldIO>;
const mockManipulateForceMoreale = manipulateForceMoreale as jest.MockedFunction<typeof manipulateForceMoreale>;
const mockSlash = slash as jest.MockedFunction<typeof slash>;
const mockHealing = healing as jest.MockedFunction<typeof healing>;
const mockHealingWave = healingWave as jest.MockedFunction<typeof healingWave>;
const mockShoot = shoot as jest.MockedFunction<typeof shoot>;
const mockFireball = fireball as jest.MockedFunction<typeof fireball>;
const mockArcaneMissiles = arcaneMissiles as jest.MockedFunction<typeof arcaneMissiles>;
// const mockHaste = haste as jest.MockedFunction<typeof haste>; // Unused
// const mockSlow = slow as jest.MockedFunction<typeof slow>; // Unused
const mockSummon = summon as jest.MockedFunction<typeof summon>;

// Helper function to create a Vec2 compatible with the Unit type
function createVec2(x: number, y: number): Vec2 {
	return vec2(x, y);
}

// Helper function to create mock trait params
function createMockTraitParams(params: Record<string, any> = {}): any {
	return { id: 'test_trait' as any, ...params };
}

// Helper function to create mock units
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
		powerType: 'damage',
		cooldown: 1000,
		position: createVec2(1, 1),
		traits: [],
		attackType: 'melee',
		crit: 0,
		tags: [],
		description: 'Test unit',
		...overrides
	} as Unit;
}

// Helper function to create mock chara
function createMockChara(unit: Unit) {
	return {
		id: unit.id,
		unitData: unit,
		active: true,
		showPopText: jest.fn().mockResolvedValue(undefined),
		updateUnitAttribute: jest.fn().mockResolvedValue(undefined),
		unitHit: jest.fn()
	};
}

describe('Keyword Trait Effect Implementations', () => {
	let mockUnit: Unit;
	let mockTargetUnit: Unit;
	let mockEnemyUnit: Unit;
	let mockScene: any;
	let mockState: any;
	let mockChara: any;
	let mockTargetChara: any;
	let mockEnemyChara: any;
	let mockContext: TraitEffectContext;
	let mockPlayerForce: Force;
	let mockEnemyForce: Force;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Create mock units
		mockUnit = createMockUnit('test-unit-1', {
			force: 'player-force',
			position: createVec2(1, 2), // Back row
			power: 25
		});

		mockTargetUnit = createMockUnit('test-target-1', {
			force: 'player-force',
			position: createVec2(0, 1),
			hp: 80
		});

		mockEnemyUnit = createMockUnit('test-enemy-1', {
			force: 'enemy-force',
			position: createVec2(2, 0),
			hp: 60
		});

		// Create mock forces
		mockPlayerForce = {
			id: 'player-force',
			units: [mockUnit, mockTargetUnit],
			morale: 100,
			maxMorale: 150
		} as Force;

		mockEnemyForce = {
			id: 'enemy-force',
			units: [mockEnemyUnit],
			morale: 120,
			maxMorale: 120
		} as Force;

		// Create mock scene
		mockScene = {
			time: { now: 5000 },
			events: { emit: jest.fn() },
			scene: { isActive: jest.fn().mockReturnValue(true) }
		};

		// Create mock state
		mockState = {
			battleData: {
				forces: [mockPlayerForce, mockEnemyForce]
			}
		};

		// Create mock charas
		mockChara = createMockChara(mockUnit);
		mockTargetChara = createMockChara(mockTargetUnit);
		mockEnemyChara = createMockChara(mockEnemyUnit);

		// Setup getChara mock
		mockGetChara.mockImplementation((id: string) => {
			if (id === mockUnit.id) return mockChara;
			if (id === mockTargetUnit.id) return mockTargetChara;
			if (id === mockEnemyUnit.id) return mockEnemyChara;
			return null;
		});

		// Create mock context
		mockContext = {
			sourceUnit: mockUnit,
			targets: [mockTargetUnit],
			scene: mockScene,
			state: mockState,
			traitInstanceParams: { id: 'test_trait' as any },
			effectInstance: { effectId: 'test_effect', eventTrigger: 'onAction' }
		};
	});

	describe('Core Combat Traits', () => {
		describe('Melee Trait (skill_melee)', () => {
			it('should execute slash skill when melee trait triggers', async () => {
				// Import and test the actual implementation
				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				// Get the registered effect
				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const meleeEffect = getTraitEffectImplementation('skill_melee');

				expect(meleeEffect).toBeDefined();
				if (meleeEffect) {
					await meleeEffect(mockContext);
					expect(mockSlash).toHaveBeenCalledWith(mockScene, mockUnit);
				}
			});
		});

		describe('Ranged Trait (skill_shoot)', () => {
			it('should execute shoot skill when ranged trait triggers', async () => {
				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const rangedEffect = getTraitEffectImplementation('skill_shoot');

				expect(rangedEffect).toBeDefined();
				if (rangedEffect) {
					await rangedEffect(mockContext);
					expect(mockShoot).toHaveBeenCalledWith(mockScene);
				}
			});
		});

		describe('Sniper Trait (trait_sniper)', () => {
			it('should give attack bonus when unit is in back row', async () => {
				// Unit is already in back row (y = 2 for player force)
				mockContext.traitInstanceParams = { id: 'sniper' as any, amount: 15 };

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const sniperEffect = getTraitEffectImplementation('trait_sniper');

				expect(sniperEffect).toBeDefined();
				if (sniperEffect) {
					await sniperEffect(mockContext);
					expect(mockChara.updateUnitAttribute).toHaveBeenCalledWith('power', 15);
				}
			});

			it('should not give bonus when unit is not in back row', async () => {
				// Move unit to front row
				mockUnit.position.y = 0;
				mockContext.traitInstanceParams = { id: 'sniper' as any, amount: 15 };

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const sniperEffect = getTraitEffectImplementation('trait_sniper');

				if (sniperEffect) {
					await sniperEffect(mockContext);
					expect(mockChara.updateUnitAttribute).not.toHaveBeenCalled();
				}
			});

			it('should use default bonus amount when not specified', async () => {
				// No amount specified, should use default of 10
				mockContext.traitInstanceParams = { id: 'sniper' as any };

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const sniperEffect = getTraitEffectImplementation('trait_sniper');

				if (sniperEffect) {
					await sniperEffect(mockContext);
					expect(mockChara.updateUnitAttribute).toHaveBeenCalledWith('power', 10);
				}
			});
		});

		describe('Healing Trait (skill_heal)', () => {
			it('should execute healing skill when healing trait triggers', async () => {
				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const healEffect = getTraitEffectImplementation('skill_heal');

				expect(healEffect).toBeDefined();
				if (healEffect) {
					await healEffect(mockContext);
					expect(mockHealing).toHaveBeenCalledWith(mockScene);
				}
			});
		});

		describe('Healing Wave Trait (skill_healing_wave)', () => {
			it('should execute healing wave skill', async () => {
				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const healWaveEffect = getTraitEffectImplementation('skill_healing_wave');

				expect(healWaveEffect).toBeDefined();
				if (healWaveEffect) {
					await healWaveEffect(mockContext);
					expect(mockHealingWave).toHaveBeenCalledWith(mockScene, mockUnit);
				}
			});
		});
	});

	describe('Advanced Combat Traits', () => {
		describe('Fireball Trait (skill_fireball)', () => {
			it('should execute fireball skill', async () => {
				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const fireballEffect = getTraitEffectImplementation('skill_fireball');

				expect(fireballEffect).toBeDefined();
				if (fireballEffect) {
					await fireballEffect(mockContext);
					expect(mockFireball).toHaveBeenCalledWith(mockScene);
				}
			});
		});

		describe('Arcane Missiles Trait (skill_arcane_missiles)', () => {
			it('should execute arcane missiles with custom projectile count', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({ projectiles: 5 });

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const missilesEffect = getTraitEffectImplementation('skill_arcane_missiles');

				expect(missilesEffect).toBeDefined();
				if (missilesEffect) {
					await missilesEffect(mockContext);
					expect(mockArcaneMissiles).toHaveBeenCalledWith(mockScene);
				}
			});

			it('should use default projectile count when not specified', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({});

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const missilesEffect = getTraitEffectImplementation('skill_arcane_missiles');

				if (missilesEffect) {
					await missilesEffect(mockContext);
					expect(mockArcaneMissiles).toHaveBeenCalledWith(mockScene);
				}
			});
		});

		describe('Summon Trait (skill_summon)', () => {
			it('should execute summon skill with specified card', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({ cardIdToSummon: 'skeleton_warrior' });

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const summonEffect = getTraitEffectImplementation('skill_summon');

				expect(summonEffect).toBeDefined();
				if (summonEffect) {
					await summonEffect(mockContext);
					expect(mockSummon).toHaveBeenCalledWith(mockChara, 'skeleton_warrior');
				}
			});

			it('should not summon when cardIdToSummon is missing', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({}); // No card specified

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const summonEffect = getTraitEffectImplementation('skill_summon');

				if (summonEffect) {
					await summonEffect(mockContext);
					expect(mockSummon).not.toHaveBeenCalled();
				}
			});
		});
	});

	describe('Utility Traits', () => {
		describe('Plunder Trait (grant_gold_to_player)', () => {
			it('should grant gold to player when source unit belongs to player', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({ amount: 5 });

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const plunderEffect = getTraitEffectImplementation('grant_gold_to_player');

				expect(plunderEffect).toBeDefined();
				if (plunderEffect) {
					await plunderEffect(mockContext);
					expect(mockUpdatePlayerGoldIO).toHaveBeenCalledWith(mockScene, 5);
					expect(mockChara.showPopText).toHaveBeenCalledWith('+5 Gold');
				}
			});

			it('should not grant gold when source unit is not player unit', async () => {
				// Change unit to enemy force
				mockUnit.force = 'enemy-force';
				mockContext.traitInstanceParams = createMockTraitParams({ amount: 5 });

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const plunderEffect = getTraitEffectImplementation('grant_gold_to_player');

				if (plunderEffect) {
					await plunderEffect(mockContext);
					expect(mockUpdatePlayerGoldIO).not.toHaveBeenCalled();
				}
			});

			it('should use default amount when not specified', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({}); // No amount specified

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const plunderEffect = getTraitEffectImplementation('grant_gold_to_player');

				if (plunderEffect) {
					await plunderEffect(mockContext);
					expect(mockUpdatePlayerGoldIO).not.toHaveBeenCalled(); // Amount is 0
				}
			});
		});

		describe('Boost Ally Damage Trait (boost_ally_damage)', () => {
			it('should apply temporary damage boost to ally targets', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({ amount: 12, duration: 4000 });

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const boostEffect = getTraitEffectImplementation('boost_ally_damage');

				expect(boostEffect).toBeDefined();
				if (boostEffect) {
					await boostEffect(mockContext);

					expect(mockApplyStatusEffect).toHaveBeenCalledWith(
						mockTargetUnit,
						expect.objectContaining({
							type: 'power_buff',
							remainingDuration: 4000,
							attribute: 'power',
							amount: 12,
							displayName: '+12 Damage!'
						})
					);
					expect(mockTargetChara.showPopText).toHaveBeenCalledWith('+12 Damage!', undefined, mockScene);
				}
			});
		});

		describe('Haste All Allies Trait (haste_all_allies)', () => {
			it('should apply haste effect to all ally targets', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({ duration: 3000 });

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const hasteEffect = getTraitEffectImplementation('haste_all_allies');

				expect(hasteEffect).toBeDefined();
				if (hasteEffect) {
					await hasteEffect(mockContext);

					expect(mockApplyStatusEffect).toHaveBeenCalledWith(
						mockTargetUnit,
						expect.objectContaining({
							type: 'haste',
							remainingDuration: 3000,
							cooldownMultiplier: 0.5,
							displayName: 'Hasted'
						})
					);
					expect(mockTargetChara.showPopText).toHaveBeenCalledWith('Hasted!', undefined, mockScene);
				}
			});
		});

		describe('Force Morale Effects', () => {
			beforeEach(() => {
				// Setup manipulateForceMoreale to return the amount passed
				mockManipulateForceMoreale.mockImplementation((_force, amount) => amount);
			});

			it('should restore force morale correctly', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({ amount: 60 });

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const restoreEffect = getTraitEffectImplementation('restore_force_morale');

				expect(restoreEffect).toBeDefined();
				if (restoreEffect) {
					await restoreEffect(mockContext);

					expect(mockManipulateForceMoreale).toHaveBeenCalledWith(
						mockPlayerForce,
						60,
						mockScene
					);
					expect(mockChara.showPopText).toHaveBeenCalledWith('+60 Morale', 'heal', mockScene);
				}
			});

			it('should reduce enemy morale correctly', async () => {
				mockContext.traitInstanceParams = createMockTraitParams({ amount: 40 });

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const reduceEffect = getTraitEffectImplementation('reduce_enemy_morale');

				expect(reduceEffect).toBeDefined();
				if (reduceEffect) {
					await reduceEffect(mockContext);

					expect(mockManipulateForceMoreale).toHaveBeenCalledWith(
						mockEnemyForce,
						-40,
						mockScene
					);
					expect(mockChara.showPopText).toHaveBeenCalledWith('Enemy -40 Morale', 'heal', mockScene);
				}
			});
		});
	});

	describe('Positional Traits', () => {
		describe('Positional Bonus Trait (positional_bonus)', () => {
			it('should give bonus when unit is in correct row', async () => {
				// Unit is in back row (y=2), check for back row bonus
				mockContext.traitInstanceParams = createMockTraitParams({
					attribute: 'power',
					amount: 8,
					row: 'back'
				});

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const positionalEffect = getTraitEffectImplementation('positional_bonus');

				expect(positionalEffect).toBeDefined();
				if (positionalEffect) {
					await positionalEffect(mockContext);
					expect(mockChara.updateUnitAttribute).toHaveBeenCalledWith('power', 8);
				}
			});

			it('should not give bonus when unit is in wrong row', async () => {
				// Unit is in back row (y=2), but checking for front row bonus
				mockContext.traitInstanceParams = createMockTraitParams({
					attribute: 'power',
					amount: 8,
					row: 'front'
				});

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const positionalEffect = getTraitEffectImplementation('positional_bonus');

				if (positionalEffect) {
					await positionalEffect(mockContext);
					expect(mockChara.updateUnitAttribute).not.toHaveBeenCalled();
				}
			});

			it('should handle enemy unit positioning correctly', async () => {
				// Test with enemy unit - enemy back row is at y=0
				mockContext.sourceUnit = mockEnemyUnit;
				mockEnemyUnit.position = createVec2(mockEnemyUnit.position.x, 0); // Enemy back row
				mockGetChara.mockReturnValue(mockEnemyChara);

				mockContext.traitInstanceParams = createMockTraitParams({
					attribute: 'hp',
					amount: 15,
					row: 'back'
				});

				const { registerAllTraitEffects } = await import('./Implementations');
				registerAllTraitEffects();

				const { getTraitEffectImplementation } = await import('../TraitEffectSystem');
				const positionalEffect = getTraitEffectImplementation('positional_bonus');

				if (positionalEffect) {
					await positionalEffect(mockContext);
					expect(mockEnemyChara.updateUnitAttribute).toHaveBeenCalledWith('hp', 15);
				}
			});
		});
	});

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
