/**
 * @file Tests for the restore force morale implementation.
 */

import { restoreForceMoralePure, createRestoreMoraleLogic, restoreMoraleLogicIO } from './restoreMorale';
import { makeForce } from '../../../Models/Entities/Force';
import { GameEvents } from '../../../constants/events';
import { Unit } from '../../../Models/Entities/Unit';
import { vec2 } from '../../../Models/Geometry.pure';

// Mock Phaser scene for testing event emission
const mockScene = {
	events: {
		emit: jest.fn()
	}
} as any;

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

describe('Restore Morale Effect (New Pattern)', () => {
	let mockUnit: Unit;
	let mockForce: any;
	let mockContext: any;

	beforeEach(() => {
		jest.clearAllMocks();

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

		// Create mock force
		mockForce = makeForce('player-force');
		mockForce.morale = 50; // Set to half health
		mockForce.maxMorale = 100;
		mockForce.shield = 0;

		// Create mock context
		mockContext = {
			sourceUnit: mockUnit,
			scene: mockScene,
			state: {
				battleData: {
					forces: [mockForce]
				}
			},
			traitInstanceParams: {},
			effectInstance: {}
		};
	});

	describe('createRestoreMoraleLogic', () => {
		it('should create logic that restores morale using unit power', async () => {
			const mockEmitter = jest.fn();
			const mockHealMorale = jest.fn();

			const logic = createRestoreMoraleLogic(mockEmitter, mockHealMorale);

			// These should be ignored now
			mockContext.traitInstanceParams = { amount: 999 };

			await logic(mockContext);

			expect(mockEmitter).toHaveBeenCalledWith(mockUnit, 20); // Uses unit.power
			expect(mockHealMorale).toHaveBeenCalledWith(mockForce, 20, mockScene);
		});

		it('should use unit power regardless of parameters', async () => {
			const mockEmitter = jest.fn();
			const mockHealMorale = jest.fn();

			const logic = createRestoreMoraleLogic(mockEmitter, mockHealMorale);

			await logic(mockContext);

			expect(mockEmitter).toHaveBeenCalledWith(mockUnit, 20); // Uses unit.power
			expect(mockHealMorale).toHaveBeenCalledWith(mockForce, 20, mockScene);
		});
	});

	describe('restoreMoraleLogicIO', () => {
		it('should emit UNIT_MORALE_RESTORED event using unit power', async () => {
			// These should be ignored now
			mockContext.traitInstanceParams = { amount: 999 };

			await restoreMoraleLogicIO(mockContext);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_MORALE_RESTORED,
				{ unit: mockUnit, amount: 20 } // Uses unit.power
			);
		});

		it('should use unit power when no parameters provided', async () => {
			await restoreMoraleLogicIO(mockContext);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_MORALE_RESTORED,
				{ unit: mockUnit, amount: 20 } // Uses unit.power
			);
		});
	});
});
