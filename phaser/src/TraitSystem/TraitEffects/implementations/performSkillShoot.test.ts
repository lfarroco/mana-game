/**
 * @file Tests for the performSkillShoot trait effect implementation
 */

import { performSkillShootLogic } from './performSkillShoot';
import { TraitEffectContext } from '../../TraitEffectSystem';
import { Unit } from '../../../Models/Entities/Unit';
import BattlegroundScene from '../../../Scenes/Battleground/BattlegroundScene';

describe('performSkillShootLogic', () => {
	let mockContext: TraitEffectContext;
	let mockUnit: Unit;
	let mockScene: BattlegroundScene;

	beforeEach(() => {
		mockUnit = {
			id: 'test-unit',
			name: 'Test Unit',
			power: 10,
			health: 100,
			maxHealth: 100,
			force: 'player',
			position: { x: 0, y: 0 }
		} as unknown as Unit;

		mockScene = {
			scene: { isActive: () => true }
		} as unknown as BattlegroundScene;

		mockContext = {
			sourceUnit: mockUnit,
			scene: mockScene,
			targets: [],
			state: {
				battleData: {
					forces: []
				}
			},
			effectInstance: {},
			traitInstanceParams: {}
		} as unknown as TraitEffectContext;
	});

	describe('input validation', () => {
		it('should accept valid context with sourceUnit and scene', () => {
			expect(() => performSkillShootLogic(mockContext)).not.toThrow();
		});

		it('should throw error when sourceUnit is missing', () => {
			mockContext.sourceUnit = null as any;
			expect(() => performSkillShootLogic(mockContext)).toThrow('performSkillShoot: sourceUnit is required');
		});

		it('should throw error when scene is missing', () => {
			mockContext.scene = null as any;
			expect(() => performSkillShootLogic(mockContext)).toThrow('performSkillShoot: scene is required');
		});
	});

	describe('edge cases', () => {
		it('should handle unit with zero power', () => {
			mockUnit.power = 0;
			expect(() => performSkillShootLogic(mockContext)).not.toThrow();
		});

		it('should handle unit with negative power', () => {
			mockUnit.power = -5;
			expect(() => performSkillShootLogic(mockContext)).not.toThrow();
		});

		it('should handle empty targets array', () => {
			mockContext.targets = [];
			expect(() => performSkillShootLogic(mockContext)).not.toThrow();
		});
	});
});
