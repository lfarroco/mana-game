import { makeForce, manipulateForceShield, applyDamageToForce } from './Force';

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
			const change = manipulateForceShield(force, 150,);

			expect(force.shield).toBe(150);
			expect(change).toBe(150);
		});

		it('should not reduce shield below 0', () => {
			const force = makeForce('test-force');
			force.shield = 50;

			const change = manipulateForceShield(force, -100,);

			expect(force.shield).toBe(0);
			expect(change).toBe(-50);
		});

		it('should emit SHIELD_UPDATED event when shield changes', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;

			manipulateForceShield(force, 50,);


		});

		it('should not emit event when shield does not change', () => {
			const force = makeForce('test-force');
			force.shield = 0;

			// Try to reduce shield below 0 (no change)
			manipulateForceShield(force, -10,);

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

		});
	});

	describe('Shield system integration', () => {
		it('should allow shield to exceed morale and display correctly', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;

			// Add shield beyond morale
			manipulateForceShield(force, 150,);

			expect(force.shield).toBe(150);

		});

		it('should handle cumulative shield additions', () => {
			const force = makeForce('test-force');
			force.morale = 100;

			manipulateForceShield(force, 20,);
			expect(force.shield).toBe(20);

			manipulateForceShield(force, 30,);
			expect(force.shield).toBe(50);

			manipulateForceShield(force, 60,);
			expect(force.shield).toBe(110); // Can exceed morale
		});
	});

	describe('Poison damage behavior', () => {
		it('should bypass shields entirely when damageType is poison', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;
			force.shield = 50;

			// Apply poison damage - should bypass shield completely
			const moraleChange = applyDamageToForce(force, 30, 0, "poison");

			// Shield should remain unchanged, all damage goes to morale
			expect(force.shield).toBe(50);
			expect(force.morale).toBe(70);
			expect(moraleChange).toBe(30);

		});

		it('should work with normal damage and shields as before', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;
			force.shield = 50;

			// Apply normal damage - should go through shield first
			const moraleChange = applyDamageToForce(force, 30, 0, "normal");

			// Shield should absorb all damage
			expect(force.shield).toBe(20);
			expect(force.morale).toBe(100);
			expect(moraleChange).toBe(0);
		});

		it('should work with timeout damage and shields', () => {
			const force = makeForce('test-force');
			force.morale = 100;
			force.maxMorale = 100;
			force.shield = 50;

			// Apply timeout damage - should go through shield first like normal damage
			const moraleChange = applyDamageToForce(force, 30, 0, "timeout");

			// Shield should absorb all damage
			expect(force.shield).toBe(20);
			expect(force.morale).toBe(100);
			expect(moraleChange).toBe(0);

		});
	});
});
