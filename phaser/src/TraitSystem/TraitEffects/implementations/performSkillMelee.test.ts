/**
 * @file Tests for the perform skill melee trait effect implementation.
 */

import { performSkillMeleeLogic } from './performSkillMelee';
import { TraitEffectContext } from '../../TraitEffectSystem';
import { Unit } from '../../../Models/Entities/Unit';
import BattlegroundScene from '../../../Scenes/Battleground/BattlegroundScene';

// Mock the slash skill
jest.mock('../../../Systems/Chara/Skills/slash', () => ({
	slash: jest.fn()
}));

// Mock BattlegroundScene
const mockScene = {
	scene: { isActive: () => true },
	time: { now: 1000 }
} as unknown as BattlegroundScene;

describe('performSkillMeleeLogic', () => {
	let mockContext: TraitEffectContext;
	let mockSourceUnit: Unit;

	beforeEach(() => {
		mockSourceUnit = {
			id: 'test-unit-1',
			name: 'Test Unit',
			power: 100,
			force: 'player',
			position: { x: 0, y: 0 }
		} as Unit;

		mockContext = {
			sourceUnit: mockSourceUnit,
			scene: mockScene,
			targets: [],
			state: {} as any,
			effectInstance: {
				effectId: 'skill_melee',
				eventTrigger: 'on_enter_battle'
			} as any,
			traitInstanceParams: {
				id: 'test-trait'
			} as any
		};

		jest.clearAllMocks();
	});

	it('should call slash skill with correct parameters', async () => {
		const { slash } = await import('../../../Systems/Chara/Skills/slash');

		await performSkillMeleeLogic(mockContext);

		expect(slash).toHaveBeenCalledWith(mockScene, mockSourceUnit);
	});

	it('should handle missing scene gracefully', async () => {
		const contextWithoutScene = {
			...mockContext,
			scene: undefined as any
		};

		// Should not throw an error
		await expect(performSkillMeleeLogic(contextWithoutScene)).resolves.not.toThrow();
	});

	it('should handle missing source unit gracefully', async () => {
		const contextWithoutSourceUnit = {
			...mockContext,
			sourceUnit: undefined as any
		};

		// Should not throw an error
		await expect(performSkillMeleeLogic(contextWithoutSourceUnit)).resolves.not.toThrow();
	});
});
