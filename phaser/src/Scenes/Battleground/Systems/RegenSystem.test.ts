import { RegenSystem } from './RegenSystem';
import { makeForce } from '../../../Models/Entities/Force';

// Mock BattlegroundScene for testing
const mockScene = {
	events: {
		emit: jest.fn()
	},
	runCombatSystem: {
		getPoisonDamageSystem: jest.fn(() => ({
			reducePoison: jest.fn()
		}))
	}
} as any;

describe('RegenSystem', () => {
	let regenSystem: RegenSystem;
	let playerForce: any;
	let cpuForce: any;

	beforeEach(() => {
		jest.clearAllMocks();
		regenSystem = new RegenSystem(mockScene);

		playerForce = makeForce('player');
		playerForce.morale = 50;
		playerForce.maxMorale = 100;

		cpuForce = makeForce('cpu');
		cpuForce.morale = 30;
		cpuForce.maxMorale = 100;

		regenSystem.initialize();
	});

	describe('initialization', () => {
		it('should initialize correctly', () => {
			expect(regenSystem.getConfig().isActive).toBe(true);
			expect(regenSystem.getConfig().totalStacks).toBe(0);
		});
	});

	describe('applyRegen', () => {
		it('should apply regen with correct damage per tick calculation', () => {
			// Test 10 power regen
			regenSystem.applyRegen(playerForce, 10);

			const stacks = regenSystem.getRegenStacks(playerForce.id);
			expect(stacks).toHaveLength(1);
			expect(stacks[0].totalHealing).toBe(10);
			expect(stacks[0].healingPerTick).toBe(1); // max(1, floor(10/10)) = 1
			expect(stacks[0].remainingHealing).toBe(10);
		});

		it('should apply regen with higher power correctly', () => {
			// Test 25 power regen
			regenSystem.applyRegen(playerForce, 25);

			const stacks = regenSystem.getRegenStacks(playerForce.id);
			expect(stacks).toHaveLength(1);
			expect(stacks[0].totalHealing).toBe(25);
			expect(stacks[0].healingPerTick).toBe(2); // max(1, floor(25/10)) = 2
			expect(stacks[0].remainingHealing).toBe(25);
		});

		it('should handle low power with minimum 1 healing per tick', () => {
			// Test 4 power regen
			regenSystem.applyRegen(playerForce, 4);

			const stacks = regenSystem.getRegenStacks(playerForce.id);
			expect(stacks).toHaveLength(1);
			expect(stacks[0].totalHealing).toBe(4);
			expect(stacks[0].healingPerTick).toBe(1); // max(1, floor(4/10)) = 1
			expect(stacks[0].remainingHealing).toBe(4);
		});

		it('should handle multiple regen stacks', () => {
			regenSystem.applyRegen(playerForce, 10);
			regenSystem.applyRegen(playerForce, 15);

			const stacks = regenSystem.getRegenStacks(playerForce.id);
			expect(stacks).toHaveLength(2);
			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(25);
		});

		it('should ignore zero or negative amounts', () => {
			regenSystem.applyRegen(playerForce, 0);
			regenSystem.applyRegen(playerForce, -5);

			expect(regenSystem.getRegenStacks(playerForce.id)).toHaveLength(0);
		});
	});

	describe('update and healing application', () => {
		it('should apply healing after tick interval', () => {
			regenSystem.applyRegen(playerForce, 10); // 1 healing per tick

			// Simulate 1 second passing
			regenSystem.update(playerForce, cpuForce, 1000);

			// Should have healed 1 point
			expect(playerForce.morale).toBe(51);

			const stacks = regenSystem.getRegenStacks(playerForce.id);
			expect(stacks[0].remainingHealing).toBe(9);
		});

		it('should not apply healing before tick interval', () => {
			regenSystem.applyRegen(playerForce, 10);
			const originalMorale = playerForce.morale;

			// Simulate 500ms passing (half tick interval)
			regenSystem.update(playerForce, cpuForce, 500);

			// Should not have healed yet
			expect(playerForce.morale).toBe(originalMorale);
		});

		it('should respect max morale', () => {
			playerForce.morale = 99;
			playerForce.maxMorale = 100;

			regenSystem.applyRegen(playerForce, 10); // Would heal 1 per tick

			// First tick - should heal to max morale
			regenSystem.update(playerForce, cpuForce, 1000);
			expect(playerForce.morale).toBe(100);

			// Second tick - should not heal beyond max
			regenSystem.update(playerForce, cpuForce, 1000);
			expect(playerForce.morale).toBe(100);
		});

		it('should remove regen stack when depleted', () => {
			regenSystem.applyRegen(playerForce, 2); // 1 healing per tick, 2 total

			// First tick
			regenSystem.update(playerForce, cpuForce, 1000);
			expect(regenSystem.getRegenStacks(playerForce.id)).toHaveLength(1);

			// Second tick - should deplete and remove stack
			regenSystem.update(playerForce, cpuForce, 1000);
			expect(regenSystem.getRegenStacks(playerForce.id)).toHaveLength(0);
		});

		it('should call poison reduction when healing is applied', () => {
			const mockPoisonSystem = {
				reducePoison: jest.fn()
			};
			mockScene.runCombatSystem = {
				getPoisonDamageSystem: jest.fn(() => mockPoisonSystem)
			};

			regenSystem.applyRegen(playerForce, 10);

			regenSystem.update(playerForce, cpuForce, 1000);

			expect(mockPoisonSystem.reducePoison).toHaveBeenCalledWith(playerForce.id, 1);
		});
	});

	describe('utility methods', () => {
		it('should calculate total regen healing correctly', () => {
			regenSystem.applyRegen(playerForce, 10);
			regenSystem.applyRegen(playerForce, 15);

			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(25);

			// After one tick
			regenSystem.update(playerForce, cpuForce, 1000);
			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(23); // 9 + 14
		});

		it('should clear regen correctly', () => {
			regenSystem.applyRegen(playerForce, 10);
			expect(regenSystem.getRegenStacks(playerForce.id)).toHaveLength(1);

			regenSystem.clearRegen(playerForce.id);
			expect(regenSystem.getRegenStacks(playerForce.id)).toHaveLength(0);
		});

		it('should stop system correctly', () => {
			regenSystem.applyRegen(playerForce, 10);
			regenSystem.stop();

			expect(regenSystem.getConfig().isActive).toBe(false);
			expect(regenSystem.getConfig().totalStacks).toBe(0);

			// Should not apply healing when stopped
			const originalMorale = playerForce.morale;
			regenSystem.update(playerForce, cpuForce, 1000);
			expect(playerForce.morale).toBe(originalMorale);
		});
	});

	describe('multiple force support', () => {
		it('should handle regen for both forces independently', () => {
			regenSystem.applyRegen(playerForce, 10);
			regenSystem.applyRegen(cpuForce, 15);

			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(10);
			expect(regenSystem.getTotalRegenHealing(cpuForce.id)).toBe(15);

			// Update both forces
			regenSystem.update(playerForce, cpuForce, 1000);

			expect(playerForce.morale).toBe(51); // 50 + 1
			expect(cpuForce.morale).toBe(31); // 30 + 1 (from 15 power = 1 per tick)
		});
	});
});
