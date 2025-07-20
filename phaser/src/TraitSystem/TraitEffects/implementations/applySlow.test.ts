/**
 * @file Tests for Apply Slow trait effect implementation
 */

import { createApplySlowLogic } from './applySlow';
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

describe('Apply Slow Effect Implementation', () => {
	let mockUnit: Unit;
	let mockTargetUnit: Unit;
	let mockContext: TraitEffectContext;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create mock units
		mockUnit = createTestUnit('source-unit', 'player', { x: 1, y: 1 });
		mockTargetUnit = createTestUnit('target-unit', 'enemy', { x: 2, y: 1 });

		// Create mock context
		mockContext = {
			sourceUnit: mockUnit,
			targets: [mockTargetUnit],
			effectInstance: {
				effectId: 'apply_slow',
				eventTrigger: 'onAction'
			},
			traitInstanceParams: {
				id: 'test-trait' as any
			},
			scene: {} as any,
			state: {} as any,
		};
	});

	describe('createApplySlowLogic', () => {
		it('should add slow duration to target units', async () => {
			// Arrange
			const applySlowLogic = createApplySlowLogic();

			// Act
			await applySlowLogic(mockContext);

			// Assert
			expect(mockTargetUnit.slowed).toBe(2000); // Default duration
		});

		it('should use custom duration from parameters', async () => {
			// Arrange
			const customContext = {
				...mockContext,
				traitInstanceParams: {
					id: 'test-trait' as any,
					duration: 3000
				}
			};

			const applySlowLogic = createApplySlowLogic();

			// Act
			await applySlowLogic(customContext);

			// Assert
			expect(mockTargetUnit.slowed).toBe(3000);
		});

		it('should use effect instance parameters over trait parameters', async () => {
			// Arrange
			const customContext = {
				...mockContext,
				traitInstanceParams: {
					id: 'test-trait' as any,
					duration: 3000
				},
				effectInstance: {
					effectId: 'apply_slow',
					eventTrigger: 'onAction',
					duration: 4000 // Should override trait param
				}
			};

			const applySlowLogic = createApplySlowLogic();

			// Act
			await applySlowLogic(customContext);

			// Assert
			expect(mockTargetUnit.slowed).toBe(4000); // Effect param overrides trait param
		});

		it('should handle multiple targets', async () => {
			// Arrange
			const mockTarget2 = createTestUnit('target-2', 'enemy', { x: 0, y: 1 });

			const multiTargetContext = {
				...mockContext,
				targets: [mockTargetUnit, mockTarget2]
			};

			const applySlowLogic = createApplySlowLogic();

			// Act
			await applySlowLogic(multiTargetContext);

			// Assert
			expect(mockTargetUnit.slowed).toBe(2000);
			expect(mockTarget2.slowed).toBe(2000);
		});

		it('should stack slow duration on units that already have slow', async () => {
			// Arrange
			mockTargetUnit.slowed = 1000; // Unit already has some slow

			const applySlowLogic = createApplySlowLogic();

			// Act
			await applySlowLogic(mockContext);

			// Assert
			expect(mockTargetUnit.slowed).toBe(3000); // 1000 + 2000 (default duration)
		});

		it('should be reusable across multiple calls', async () => {
			// Arrange
			const applySlowLogic = createApplySlowLogic();

			// Act
			await applySlowLogic(mockContext);
			await applySlowLogic(mockContext);

			// Assert
			expect(mockTargetUnit.slowed).toBe(4000); // 2000 + 2000 (stacks)
		});
	});
});
