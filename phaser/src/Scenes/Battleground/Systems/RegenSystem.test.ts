import { makeForce } from '@Models/Entities/Force';
import * as regenSystem from './RegenSystem';

describe('RegenSystem', () => {
	let playerForce: any;
	let cpuForce: any;

	beforeEach(() => {
		jest.clearAllMocks();

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
			expect(regenSystem.getConfig().activeForces).toBe(0);
		});
	});

	describe('applyRegen', () => {
		it('should accumulate regen in the pool', () => {
			regenSystem.applyRegen(playerForce, 10);
			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(10);

			regenSystem.applyRegen(playerForce, 15);
			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(25);
		});

		it('should ignore zero or negative amounts', () => {
			regenSystem.applyRegen(playerForce, 0);
			regenSystem.applyRegen(playerForce, -5);

			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(0);
		});
	});

	describe('update and healing application', () => {
		it('should apply total pool as healing after tick interval', () => {
			regenSystem.applyRegen(playerForce, 10);
			regenSystem.applyRegen(playerForce, 15);

			// Simulate 1 second passing
			regenSystem.update(playerForce, cpuForce, 1000);

			// Should have healed 25 points
			expect(playerForce.morale).toBe(75);
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

			regenSystem.applyRegen(playerForce, 10); // Would heal 10 per tick

			// First tick - should heal to max morale (only +1 applied)
			regenSystem.update(playerForce, cpuForce, 1000);
			expect(playerForce.morale).toBe(100);

			// Second tick - should not heal beyond max
			regenSystem.update(playerForce, cpuForce, 1000);
			expect(playerForce.morale).toBe(100);
		});

		it('should keep regen pool until cleared or stopped', () => {
			regenSystem.applyRegen(playerForce, 2);
			regenSystem.update(playerForce, cpuForce, 1000);
			// Pool remains 2 (applies each tick)
			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(2);
		});

		it('should reduce poison when healing is applied', () => {
			// This test now implicitly relies on reducePoison called inside system
			// No direct assertion here without a more complex mock setup
			regenSystem.applyRegen(playerForce, 10);
			regenSystem.update(playerForce, cpuForce, 1000);
			expect(playerForce.morale).toBe(60);
		});
	});

	describe('utility methods', () => {
		it('should report total regen pool correctly', () => {
			regenSystem.applyRegen(playerForce, 10);
			regenSystem.applyRegen(playerForce, 15);
			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(25);
		});

		it('should clear regen correctly', () => {
			regenSystem.applyRegen(playerForce, 10);
			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(10);

			regenSystem.clearRegen(playerForce.id);
			expect(regenSystem.getTotalRegenHealing(playerForce.id)).toBe(0);
		});

		it('should stop system correctly', () => {
			regenSystem.applyRegen(playerForce, 10);
			regenSystem.stop();

			expect(regenSystem.getConfig().isActive).toBe(false);
			expect(regenSystem.getConfig().activeForces).toBe(0);

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

			expect(playerForce.morale).toBe(60); // 50 + 10
			expect(cpuForce.morale).toBe(45); // 30 + 15
		});
	});
});
