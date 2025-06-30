/**
 * @file Test for Deal Damage trait effect implementation
 * Tests the deal damage effect logic using pure function injection.
 */

import { createDealDamageLogic } from './dealDamage';
import { getEffectParams } from '../../TraitSystem.pure';
import { Unit } from '../../../Models/Entities/Unit';
import { TraitEffectContext } from '../../TraitEffectSystem';
import { vec2 } from '../../../Models/Geometry.pure';

describe('Deal Damage Implementation', () => {
	let mockUnit: Unit;
	let mockTargetUnit: Unit;
	let mockChara: any;
	let mockContext: TraitEffectContext;
	let mockGetChara: jest.MockedFunction<(id: string) => any>;

	beforeEach(() => {
		// Create mock unit
		mockUnit = {
			id: 'test-unit-1',
			cardId: 'test-card-1',
			name: 'Test Unit',
			pic: 'test-pic.png',
			force: 'player-force',
			hp: 100,
			maxHp: 100,
			power: 20,
			attackType: 'damage',
			cooldown: 1000,
			crit: 0,
			evade: 0,
			position: vec2(1, 2),
			traits: [],
			charge: 0,
			refresh: 0,
			hasted: 0,
			slowed: 0
		} as Unit;

		mockTargetUnit = {
			id: 'test-target-1',
			cardId: 'test-target-card',
			name: 'Target Unit',
			pic: 'target-pic.png',
			force: 'enemy-force',
			hp: 80,
			maxHp: 80,
			power: 15,
			attackType: 'damage',
			cooldown: 1200,
			crit: 0,
			evade: 0,
			position: vec2(0, 1),
			traits: [],
			charge: 0,
			refresh: 0,
			hasted: 0,
			slowed: 0
		} as Unit;

		// Create mock chara
		mockChara = {
			id: 'test-target-1',
			active: true,
			showPopText: jest.fn().mockResolvedValue(undefined)
		};

		// Create mock getChara function
		mockGetChara = jest.fn().mockImplementation((id: string) => {
			return id === 'test-target-1' ? mockChara : undefined;
		});

		// Create base context
		mockContext = {
			sourceUnit: mockUnit,
			targets: [mockTargetUnit],
			scene: {} as any,
			state: {} as any,
			traitInstanceParams: { id: 'test-trait' as any },
			effectInstance: { effectId: 'deal_damage', eventTrigger: 'onAction' }
		};
	});

	describe('createDealDamageLogic', () => {
		it('should create a function that deals damage to targets', async () => {
			const dealDamageEffect = createDealDamageLogic(mockGetChara);
			
			const contextWithDamage = {
				...mockContext,
				traitInstanceParams: { id: 'test-trait' as any, amount: 25 }
			};

			await dealDamageEffect(contextWithDamage);

			expect(mockGetChara).toHaveBeenCalledWith('test-target-1');
			expect(mockChara.showPopText).toHaveBeenCalledWith('-25 Dmg', 'damage');
		});

		it('should use default damage amount when not specified', async () => {
			const dealDamageEffect = createDealDamageLogic(mockGetChara);
			
			// Context without amount specified
			const contextWithoutAmount = {
				...mockContext,
				traitInstanceParams: { id: 'test-trait' as any }
			};

			await dealDamageEffect(contextWithoutAmount);

			expect(mockChara.showPopText).toHaveBeenCalledWith('-0 Dmg', 'damage');
		});

		it('should resolve damage amount from effect instance params', async () => {
			const dealDamageEffect = createDealDamageLogic(mockGetChara);
			
			const contextWithEffectAmount = {
				...mockContext,
				traitInstanceParams: { id: 'test-trait' as any },
				effectInstance: { 
					effectId: 'deal_damage', 
					eventTrigger: 'onAction',
					amount: 50 
				}
			};

			await dealDamageEffect(contextWithEffectAmount);

			expect(mockChara.showPopText).toHaveBeenCalledWith('-50 Dmg', 'damage');
		});

		it('should prioritize effect instance params over trait params', async () => {
			const dealDamageEffect = createDealDamageLogic(mockGetChara);
			
			const contextWithBothAmounts = {
				...mockContext,
				traitInstanceParams: { id: 'test-trait' as any, amount: 25 },
				effectInstance: { 
					effectId: 'deal_damage', 
					eventTrigger: 'onAction',
					amount: 75 // This should override trait amount
				}
			};

			await dealDamageEffect(contextWithBothAmounts);

			expect(mockChara.showPopText).toHaveBeenCalledWith('-75 Dmg', 'damage');
		});

		it('should handle multiple targets', async () => {
			const secondTargetUnit = {
				...mockTargetUnit,
				id: 'test-target-2',
				name: 'Second Target'
			};

			const secondMockChara = {
				id: 'test-target-2',
				active: true,
				showPopText: jest.fn().mockResolvedValue(undefined)
			};

			mockGetChara.mockImplementation((id: string) => {
				if (id === 'test-target-1') return mockChara;
				if (id === 'test-target-2') return secondMockChara;
				return undefined;
			});

			const dealDamageEffect = createDealDamageLogic(mockGetChara);
			
			const contextWithMultipleTargets = {
				...mockContext,
				targets: [mockTargetUnit, secondTargetUnit],
				traitInstanceParams: { id: 'test-trait' as any, amount: 30 }
			};

			await dealDamageEffect(contextWithMultipleTargets);

			expect(mockGetChara).toHaveBeenCalledWith('test-target-1');
			expect(mockGetChara).toHaveBeenCalledWith('test-target-2');
			expect(mockChara.showPopText).toHaveBeenCalledWith('-30 Dmg', 'damage');
			expect(secondMockChara.showPopText).toHaveBeenCalledWith('-30 Dmg', 'damage');
		});

		it('should handle missing chara gracefully', async () => {
			// Mock getChara to return undefined (chara not found)
			const mockGetCharaFailing = jest.fn().mockReturnValue(undefined);
			const dealDamageEffect = createDealDamageLogic(mockGetCharaFailing);
			
			const contextWithDamage = {
				...mockContext,
				traitInstanceParams: { id: 'test-trait' as any, amount: 25 }
			};

			// Should not throw an error
			await expect(dealDamageEffect(contextWithDamage)).resolves.toBeUndefined();
			
			expect(mockGetCharaFailing).toHaveBeenCalledWith('test-target-1');
		});
	});

	describe('Parameter Resolution Integration', () => {
		it('should demonstrate getEffectParams behavior', () => {
			const traitParams = { amount: 25 };
			const effectParams = { duration: 3000 };

			const amount = getEffectParams(traitParams, effectParams, 'amount', 10);
			const duration = getEffectParams(traitParams, effectParams, 'duration', 2000);
			const missing = getEffectParams(traitParams, effectParams, 'missing', 50);

			expect(amount).toBe(25); // From trait params
			expect(duration).toBe(3000); // From effect params
			expect(missing).toBe(50); // Default value
		});

		it('should demonstrate parameter override behavior', () => {
			const traitParams = { amount: 25, duration: 1000 };
			const effectParams = { amount: 35 }; // Override trait amount

			const amount = getEffectParams(traitParams, effectParams, 'amount', 10);
			const duration = getEffectParams(traitParams, effectParams, 'duration', 2000);

			expect(amount).toBe(35); // Effect param overrides trait param
			expect(duration).toBe(1000); // Trait param used when not in effect
		});
	});
});
