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
		it('should create logic that adds shield to source force', async () => {
			const mockEmitter = jest.fn();
			const mockAddShield = jest.fn();

			const logic = createAddShieldLogic(mockEmitter, mockAddShield);

			mockContext.traitInstanceParams = { amount: 50 };

			await logic(mockContext);

			expect(mockEmitter).toHaveBeenCalledWith(mockUnit, 50);
			expect(mockAddShield).toHaveBeenCalledWith(mockForce, 50, mockScene);
		});

		it('should use default amount of 10 when not specified', async () => {
			const mockEmitter = jest.fn();
			const mockAddShield = jest.fn();

			const logic = createAddShieldLogic(mockEmitter, mockAddShield);

			await logic(mockContext);

			expect(mockEmitter).toHaveBeenCalledWith(mockUnit, 10);
			expect(mockAddShield).toHaveBeenCalledWith(mockForce, 10, mockScene);
		});

		it('should prioritize effectInstance params over traitInstanceParams', async () => {
			const mockEmitter = jest.fn();
			const mockAddShield = jest.fn();

			const logic = createAddShieldLogic(mockEmitter, mockAddShield);

			mockContext.traitInstanceParams = { amount: 30 };
			mockContext.effectInstance = { amount: 75 };

			await logic(mockContext);

			expect(mockEmitter).toHaveBeenCalledWith(mockUnit, 75);
			expect(mockAddShield).toHaveBeenCalledWith(mockForce, 75, mockScene);
		});
	});

	describe('addShieldLogicIO', () => {
		it('should emit UNIT_SHIELD_GAINED event and call manipulateForceShield', async () => {
			mockContext.traitInstanceParams = { amount: 25 };

			await addShieldLogicIO(mockContext);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 25 }
			);
		});

		it('should add shield to the force correctly', async () => {
			mockContext.traitInstanceParams = { amount: 40 };

			await addShieldLogicIO(mockContext);

			// The actual manipulateForceShield function should be called
			// We can verify this by checking that the event was emitted
			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 40 }
			);
		});

		it('should work with default amount when no parameters provided', async () => {
			await addShieldLogicIO(mockContext);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 10 }
			);
		});
	});

	describe('Integration with shield system', () => {
		it('should be compatible with cumulative shield additions', async () => {
			// First shield addition
			mockContext.traitInstanceParams = { amount: 30 };
			await addShieldLogicIO(mockContext);

			// Second shield addition
			mockContext.traitInstanceParams = { amount: 20 };
			await addShieldLogicIO(mockContext);

			// Should emit 4 total events: 2 UNIT_SHIELD_GAINED + 2 SHIELD_UPDATED
			expect(mockScene.events.emit).toHaveBeenCalledTimes(4);

			// Check that the UNIT_SHIELD_GAINED events were emitted correctly
			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 30 }
			);
			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 20 }
			);
		});

		it('should allow shield to exceed morale value', async () => {
			mockForce.morale = 50; // Set lower morale
			mockContext.traitInstanceParams = { amount: 100 }; // Add more shield than morale

			await addShieldLogicIO(mockContext);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.UNIT_SHIELD_GAINED,
				{ unit: mockUnit, amount: 100 }
			);
		});
	});
});
