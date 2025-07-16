/**
 * @file Tests for Apply Charge trait effect implementation
 */

import { createApplyChargeLogic } from './applyCharge';
import { Unit } from '../../../Models/Entities/Unit';
import { TraitEffectContext } from '../../TraitEffectSystem';
import { vec2 } from '../../../Models/Geometry.pure';

// Mock the external dependencies
jest.mock('../../../Effects/arcaneMissileTargeted', () => ({
	arcaneMissileTargeted: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../Effects/hasteEffect', () => ({
	hasteEffect: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../Scenes/Battleground/Systems/CharaManager', () => ({
	getChara: jest.fn().mockReturnValue(null)
}));

function createTestUnit(id: string, force: string, position: { x: number; y: number }): Unit {
	return {
		id,
		cardId: 'test-card',
		name: 'Test Unit',
		pic: 'test.png',
		force,
		hp: 100,
		maxHp: 100,
		power: 15,
		attackType: 'damage',
		cooldown: 1000,
		crit: 0,
		evade: 0,
		position: vec2(position.x, position.y),
		traits: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0
	} as Unit;
}

describe('Apply Charge Effect Implementation', () => {
	let mockUnit: Unit;
	let mockTargetUnit: Unit;
	let mockContext: TraitEffectContext;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create mock units
		mockUnit = createTestUnit('source-unit', 'player', { x: 1, y: 1 });
		mockTargetUnit = createTestUnit('target-unit', 'player', { x: 2, y: 1 });

		// Create mock context
		mockContext = {
			sourceUnit: mockUnit,
			targets: [mockTargetUnit],
			effectInstance: {
				effectId: 'apply_charge',
				eventTrigger: 'onAction'
			},
			traitInstanceParams: {
				id: 'test-trait' as any
			},
			scene: {} as any,
			state: {} as any,
		};
	});

	it('should apply charge to target units without scene', async () => {
		// Arrange
		const applyChargeLogic = createApplyChargeLogic();

		// Act
		await applyChargeLogic(mockContext);

		// Assert
		expect(mockTargetUnit.charge).toBe(1); // Default charge amount
	});

	it('should apply custom charge amount to target units', async () => {
		// Arrange
		const applyChargeLogic = createApplyChargeLogic();
		mockContext.traitInstanceParams = {
			id: 'test-trait' as any,
			amount: 5
		};

		// Act
		await applyChargeLogic(mockContext);

		// Assert
		expect(mockTargetUnit.charge).toBe(5);
	});

	it('should initialize charge property if it does not exist', async () => {
		// Arrange
		const applyChargeLogic = createApplyChargeLogic();
		delete (mockTargetUnit as any).charge; // Remove charge property

		// Act
		await applyChargeLogic(mockContext);

		// Assert
		expect(mockTargetUnit.charge).toBe(1);
	});

	it('should accumulate charge on multiple applications', async () => {
		// Arrange
		const applyChargeLogic = createApplyChargeLogic();
		mockTargetUnit.charge = 3; // Start with some charge
		mockContext.traitInstanceParams = {
			id: 'test-trait' as any,
			amount: 2
		};

		// Act
		await applyChargeLogic(mockContext);

		// Assert
		expect(mockTargetUnit.charge).toBe(5); // 3 + 2
	});

	it('should apply charge to multiple target units', async () => {
		// Arrange
		const applyChargeLogic = createApplyChargeLogic();
		const secondTarget = createTestUnit('target-unit-2', 'player', { x: 3, y: 1 });
		mockContext.targets = [mockTargetUnit, secondTarget];
		mockContext.traitInstanceParams = {
			id: 'test-trait' as any,
			amount: 3
		};

		// Act
		await applyChargeLogic(mockContext);

		// Assert
		expect(mockTargetUnit.charge).toBe(3);
		expect(secondTarget.charge).toBe(3);
	});
});
