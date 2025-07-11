import { makeForce, manipulateForceShield, applyDamageToForce } from './Force';
import { GameEvents } from '../../constants/events';

// Mock Phaser scene for testing event emission
const mockScene = {
	events: {
		emit: jest.fn()
	}
} as any;

describe('Force Shield System', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('makeForce', () => {
		it('should initialize shield to 0', () => {
			const force = makeForce('test-force');
			expect(force.shield).toBe(0);
		});
	});

	describe('manipulateForceShield', () => {
		it('should increase shield beyond morale value', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;

			// Shield can exceed morale
			const change = manipulateForceShield(force, 150, mockScene);

			expect(force.shield).toBe(150);
			expect(change).toBe(150);
		});

		it('should not reduce shield below 0', () => {
			const force = makeForce('test-force');
			force.shield = 50;

			const change = manipulateForceShield(force, -100, mockScene);

			expect(force.shield).toBe(0);
			expect(change).toBe(-50);
		});

		it('should emit SHIELD_UPDATED event when shield changes', () => {
			const force = makeForce('test-force');
			force.morale = 100;

			manipulateForceShield(force, 50, mockScene);

			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.SHIELD_UPDATED,
				{
					forceId: force.id,
					newShield: 50,
					maxShield: 100, // Uses morale as maxShield for display
				}
			);
		});

		it('should not emit event when shield does not change', () => {
			const force = makeForce('test-force');
			force.shield = 0;

			// Try to reduce shield below 0 (no change)
			manipulateForceShield(force, -10, mockScene);

			expect(mockScene.events.emit).not.toHaveBeenCalled();
		});

		it('should work without scene parameter', () => {
			const force = makeForce('test-force');

			const change = manipulateForceShield(force, 30);

			expect(force.shield).toBe(30);
			expect(change).toBe(30);
		});
	});

	describe('applyDamageToForce', () => {
		it('should apply damage to shield first, then morale', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;
			force.shield = 50;

			const moraleChange = applyDamageToForce(force, 30, mockScene);

			// Shield absorbs all damage
			expect(force.shield).toBe(20);
			expect(force.morale).toBe(100);
			expect(moraleChange).toBe(0);
		});

		it('should apply remaining damage to morale after shield is depleted', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;
			force.shield = 30;

			const moraleChange = applyDamageToForce(force, 50, mockScene);

			// Shield absorbs 30, remaining 20 goes to morale
			expect(force.shield).toBe(0);
			expect(force.morale).toBe(80);
			expect(moraleChange).toBe(20);
		});

		it('should handle zero damage', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.shield = 50;

			const moraleChange = applyDamageToForce(force, 0, mockScene);

			expect(force.shield).toBe(50);
			expect(force.morale).toBe(100);
			expect(moraleChange).toBe(0);
		});

		it('should handle negative damage', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.shield = 50;

			const moraleChange = applyDamageToForce(force, -10, mockScene);

			expect(force.shield).toBe(50);
			expect(force.morale).toBe(100);
			expect(moraleChange).toBe(0);
		});

		it('should work when force has no shield', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;
			force.shield = 0;

			const moraleChange = applyDamageToForce(force, 25, mockScene);

			expect(force.shield).toBe(0);
			expect(force.morale).toBe(75);
			expect(moraleChange).toBe(25);
		});

		it('should emit correct events for shield and morale changes', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;
			force.shield = 20;

			applyDamageToForce(force, 30, mockScene);

			// Should emit shield update event (shield goes to 0)
			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.SHIELD_UPDATED,
				expect.objectContaining({
					forceId: force.id,
					newShield: 0,
					maxShield: 100,
				})
			);

			// Should emit morale update event (morale reduced by 10)
			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.MORALE_UPDATED,
				expect.objectContaining({
					forceId: force.id,
					newMorale: 90,
					maxMorale: 100,
				})
			);
		});
	});

	describe('Shield system integration', () => {
		it('should allow shield to exceed morale and display correctly', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;

			// Add shield beyond morale
			manipulateForceShield(force, 150, mockScene);

			expect(force.shield).toBe(150);
			expect(mockScene.events.emit).toHaveBeenCalledWith(
				GameEvents.SHIELD_UPDATED,
				{
					forceId: force.id,
					newShield: 150,
					maxShield: 100, // Display scale still based on morale
				}
			);
		});

		it('should handle cumulative shield additions', () => {
			const force = makeForce('test-force');
			force.morale = 100;

			manipulateForceShield(force, 20, mockScene);
			expect(force.shield).toBe(20);

			manipulateForceShield(force, 30, mockScene);
			expect(force.shield).toBe(50);

			manipulateForceShield(force, 60, mockScene);
			expect(force.shield).toBe(110); // Can exceed morale
		});
	});
});
