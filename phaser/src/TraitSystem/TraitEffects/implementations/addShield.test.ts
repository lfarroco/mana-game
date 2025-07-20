import { createAddShieldLogic, addShieldLogicIO } from './addShield';
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

describe('Add Shield Effect', () => {
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
		mockForce.morale = 100;
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
	describe('createAddShieldLogic', () => {
		it('should create logic that adds shield to source force using unit power', async () => {
			const mockEmitter = jest.fn();
			const mockAddShield = jest.fn();

			const logic = createAddShieldLogic(mockEmitter, mockAddShield);

			await logic(mockContext);

			expect(mockEmitter).toHaveBeenCalledWith(mockUnit, 20); // Uses unit.power
			expect(mockAddShield).toHaveBeenCalledWith(mockForce, 20, mockScene);
		});

		it('should use unit power regardless of trait params', async () => {
			const mockEmitter = jest.fn();
			const mockAddShield = jest.fn();

			const logic = createAddShieldLogic(mockEmitter, mockAddShield);

			// These should be ignored now
			mockContext.traitInstanceParams = { amount: 999 };
			mockContext.effectInstance = { amount: 888 };

			await logic(mockContext);

			expect(mockEmitter).toHaveBeenCalledWith(mockUnit, 20); // Still uses unit.power
			expect(mockAddShield).toHaveBeenCalledWith(mockForce, 20, mockScene);
		});
	});
	describe('addShieldLogicIO', () => {
		it('should emit UNIT_SHIELD_GAINED event using unit power', async () => {
			await addShieldLogicIO(mockContext);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 20 } // Uses unit.power
			);
		});

		it('should add shield using unit power regardless of trait params', async () => {
			// These should be ignored now
			mockContext.traitInstanceParams = { amount: 999 };

			await addShieldLogicIO(mockContext);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 20 } // Still uses unit.power
			);
		});

		it('should use unit power when no parameters provided', async () => {
			await addShieldLogicIO(mockContext);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 20 } // Uses unit.power
			);
		});
	});

	describe('Integration with shield system', () => {
		it('should be compatible with cumulative shield additions', async () => {
			// First shield addition - parameters ignored, uses unit.power
			mockContext.traitInstanceParams = { amount: 999 };
			await addShieldLogicIO(mockContext);

			// Second shield addition - parameters ignored, uses unit.power
			mockContext.traitInstanceParams = { amount: 888 };
			await addShieldLogicIO(mockContext);

			// Should emit 4 total events: 2 UNIT_SHIELD_GAINED + 2 SHIELD_UPDATED
			expect(mockScene.events.emit).toHaveBeenCalledTimes(4);

			// Check that the UNIT_SHIELD_GAINED events were emitted correctly
			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 20 } // Uses unit.power
			);
			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 20 } // Uses unit.power
			);
		});

		it('should allow shield to exceed morale value', async () => {
			mockForce.morale = 50; // Set lower morale
			mockContext.traitInstanceParams = { amount: 999 }; // This is ignored

			await addShieldLogicIO(mockContext);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 20 } // Uses unit.power
			);
		});
	});
});
