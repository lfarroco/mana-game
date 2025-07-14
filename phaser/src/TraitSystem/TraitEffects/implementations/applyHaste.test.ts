/**
 * @file Tests for Apply Haste trait effect implementation
 */

import { createApplyHasteLogic } from './applyHaste';
import { Unit } from '../../../Models/Entities/Unit';
import { TraitEffectContext } from '../../TraitEffectSystem';
import { vec2 } from '../../../Models/Geometry.pure';

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

describe('Apply Haste Effect Implementation', () => {
	let mockUnit: Unit;
	let mockTargetUnit: Unit;
	let mockContext: TraitEffectContext;
	let popTextCalls: Array<{ unit: Unit; text: string }>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create mock units
		mockUnit = createTestUnit('source-unit', 'player', { x: 1, y: 1 });
		mockTargetUnit = createTestUnit('target-unit', 'player', { x: 2, y: 1 });

		// Track pop text calls
		popTextCalls = [];

		// Create mock context
		mockContext = {
			sourceUnit: mockUnit,
			targets: [mockTargetUnit],
			effectInstance: {
				effectId: 'apply_haste',
				eventTrigger: 'onAction'
			},
			traitInstanceParams: {
				id: 'test-trait' as any
			},
			scene: {} as any,
			state: {} as any,
		};
	});

	describe('createApplyHasteLogic', () => {
		it('should add haste duration to target units', async () => {
			// Arrange
			const mockShowPopText = jest.fn(async (unit: Unit, text: string) => {
				popTextCalls.push({ unit, text });
			});

			const applyHasteLogic = createApplyHasteLogic(mockShowPopText);

			// Act
			await applyHasteLogic(mockContext);

			// Assert
			expect(mockTargetUnit.hasted).toBe(2000); // Default duration
			expect(mockShowPopText).toHaveBeenCalledTimes(1);
			expect(mockShowPopText).toHaveBeenCalledWith(mockTargetUnit, 'Hasted');
		});

		it('should use custom duration from parameters', async () => {
			// Arrange
			const mockShowPopText = jest.fn();

			const customContext = {
				...mockContext,
				traitInstanceParams: {
					id: 'test-trait' as any,
					duration: 3000
				}
			};

			const applyHasteLogic = createApplyHasteLogic(mockShowPopText);

			// Act
			await applyHasteLogic(customContext);

			// Assert
			expect(mockTargetUnit.hasted).toBe(3000);
		});

		it('should use effect instance parameters over trait parameters', async () => {
			// Arrange
			const mockShowPopText = jest.fn();

			const customContext = {
				...mockContext,
				traitInstanceParams: {
					id: 'test-trait' as any,
					duration: 3000
				},
				effectInstance: {
					effectId: 'apply_haste',
					eventTrigger: 'onAction',
					duration: 4000 // Should override trait param
				}
			};

			const applyHasteLogic = createApplyHasteLogic(mockShowPopText);

			// Act
			await applyHasteLogic(customContext);

			// Assert
			expect(mockTargetUnit.hasted).toBe(4000); // Effect param overrides trait param
		});

		it('should handle multiple targets', async () => {
			// Arrange
			const mockTarget2 = createTestUnit('target-2', 'player', { x: 0, y: 1 });
			const mockShowPopText = jest.fn();

			const multiTargetContext = {
				...mockContext,
				targets: [mockTargetUnit, mockTarget2]
			};

			const applyHasteLogic = createApplyHasteLogic(mockShowPopText);

			// Act
			await applyHasteLogic(multiTargetContext);

			// Assert
			expect(mockTargetUnit.hasted).toBe(2000);
			expect(mockTarget2.hasted).toBe(2000);
			expect(mockShowPopText).toHaveBeenCalledTimes(2);

			expect(mockShowPopText).toHaveBeenCalledWith(mockTargetUnit, 'Hasted');
			expect(mockShowPopText).toHaveBeenCalledWith(mockTarget2, 'Hasted');
		});

		it('should stack haste duration on units that already have haste', async () => {
			// Arrange
			const mockShowPopText = jest.fn();
			mockTargetUnit.hasted = 1000; // Unit already has some haste

			const applyHasteLogic = createApplyHasteLogic(mockShowPopText);

			// Act
			await applyHasteLogic(mockContext);

			// Assert
			expect(mockTargetUnit.hasted).toBe(3000); // 1000 + 2000 (default duration)
		});

		it('should handle errors gracefully', async () => {
			// Arrange
			const mockShowPopText = jest.fn(() => {
				throw new Error('Pop text failed');
			});

			const applyHasteLogic = createApplyHasteLogic(mockShowPopText);

			// Act & Assert
			await expect(applyHasteLogic(mockContext)).rejects.toThrow('Pop text failed');
			expect(mockTargetUnit.hasted).toBe(2000); // Should still apply the haste even if pop text fails
		});

		it('should be reusable across multiple calls', async () => {
			// Arrange
			const mockShowPopText = jest.fn();
			const applyHasteLogic = createApplyHasteLogic(mockShowPopText);

			// Act
			await applyHasteLogic(mockContext);
			await applyHasteLogic(mockContext);

			// Assert
			expect(mockTargetUnit.hasted).toBe(4000); // 2000 + 2000 (stacks)
			expect(mockShowPopText).toHaveBeenCalledTimes(2);
		});
	});
});
