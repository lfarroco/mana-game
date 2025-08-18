import { Force, manipulateForceMorale } from "../../../Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";
import { reducePoison } from "./PoisonDamageSystem";

/**
 * Represents a regeneration stack on a force
 */
export type RegenStack = {
	totalHealing: number; // Total healing this regen will provide
	healingPerTick: number; // Healing provided per tick
	remainingHealing: number; // Remaining healing to be applied
	timeSinceLastTick: number; // Time since last healing application
	sourceUnitId?: string; // ID of the unit that applied this regen
};

/**
 * System that manages regeneration (healing over time) for forces
 * Regen provides consistent healing per second until total healing is reached
 * Healing per tick = max(1, floor(totalHealing / 10))
 */
export class RegenSystem {
	private readonly tickInterval: number = 1000; // 1 second between regen ticks
	private isActive: boolean = false;

	// Regen stacks for each force
	private regenStacks: Map<string, RegenStack[]> = new Map();

	/**
	 * Initializes the regen system for a new combat.
	 */
	initialize(): void {
		this.isActive = true;
		this.regenStacks.clear();
	}

	/**
	 * Applies regeneration to a target force
	 * @param targetForce The force to apply regen to
	 * @param amount Total healing to provide over time
	 * @param sourceUnitId Optional ID of the unit applying regen
	 */
	applyRegen(targetForce: Force, amount: number, sourceUnitId?: string): void {
		if (amount <= 0) return;

		const forceId = targetForce.id;
		if (!this.regenStacks.has(forceId)) {
			this.regenStacks.set(forceId, []);
		}

		const stacks = this.regenStacks.get(forceId)!;

		// Calculate healing per tick: 1 healing per tick for every 10 power
		// Minimum 1 healing per tick, provides total healing over time
		const healingPerTick = Math.max(1, Math.floor(amount / 10));

		// Add new regen stack
		stacks.push({
			totalHealing: amount,
			healingPerTick: healingPerTick,
			remainingHealing: amount,
			timeSinceLastTick: 0,
			sourceUnitId
		});

		const ticksRequired = Math.ceil(amount / healingPerTick);
		console.log(`[RegenSystem] Applied ${amount} regen to force ${forceId} (${healingPerTick} per tick, ${ticksRequired} ticks)`);

		// Note: Removed regen effect display for consistency with other healing types
	}

	/**
	 * Updates the regen system. Should be called every frame during combat.
	 * @param playerForce The player's force
	 * @param cpuForce The CPU's force
	 * @param delta The time delta since last update in milliseconds
	 */
	update(playerForce: Force, cpuForce: Force, delta: number): void {
		if (!this.isActive) return;

		// Update regen for both forces
		this.updateForceRegen(playerForce, delta);
		this.updateForceRegen(cpuForce, delta);
	}

	/**
	 * Updates regen stacks for a specific force
	 * @param force The force to update
	 * @param delta Time delta in milliseconds
	 */
	private updateForceRegen(force: Force, delta: number): void {
		const forceId = force.id;
		const stacks = this.regenStacks.get(forceId);

		if (!stacks || stacks.length === 0) return;

		// Update each regen stack
		for (let i = stacks.length - 1; i >= 0; i--) {
			const stack = stacks[i];
			stack.timeSinceLastTick += delta;

			// Check if it's time for a regen tick
			if (stack.timeSinceLastTick >= this.tickInterval) {
				// Apply regen healing (consistent amount per tick)
				const healing = Math.min(stack.healingPerTick, stack.remainingHealing);
				console.log(`[RegenSystem] Regen tick on ${forceId}: ${healing} healing (${stack.remainingHealing} remaining)`);

				// Apply healing to morale, respecting max morale
				// The manipulateForceMorale function will emit MORALE_UPDATED event automatically
				const actualHealing = manipulateForceMorale(force, healing);

				// Track regen healing in combat stats
				if (stack.sourceUnitId && actualHealing > 0) {
					CombatStatsTracker.trackHealing(stack.sourceUnitId, actualHealing, 'regen');
				}

				// If the poison system exists, reduce poison based on healing
				if (actualHealing > 0) {
					reducePoison(forceId, actualHealing);
				}

				// Decrease remaining regen healing
				stack.remainingHealing = Math.max(0, stack.remainingHealing - healing);
				stack.timeSinceLastTick = 0;

				// Remove stack if regen is depleted
				if (stack.remainingHealing <= 0) {
					stacks.splice(i, 1);
					console.log(`[RegenSystem] Regen stack expired for force ${forceId}`);
				}
			}
		}
	}

	/**
	 * Gets total regen healing that will be applied to a force
	 * @param forceId The force ID to check
	 * @returns Total remaining regen healing
	 */
	getTotalRegenHealing(forceId: string): number {
		const stacks = this.regenStacks.get(forceId);
		if (!stacks) return 0;

		// Simply sum all remaining healing from all stacks
		return stacks.reduce((total, stack) => total + stack.remainingHealing, 0);
	}

	/**
	 * Gets current regen stacks for a force
	 * @param forceId The force ID to check
	 * @returns Array of regen stacks
	 */
	getRegenStacks(forceId: string): RegenStack[] {
		return this.regenStacks.get(forceId) || [];
	}

	/**
	 * Clears all regen from a force
	 * @param forceId The force ID to clear
	 */
	clearRegen(forceId: string): void {
		this.regenStacks.delete(forceId);
	}

	/**
	 * Stops the regen system.
	 */
	stop(): void {
		this.isActive = false;
		this.regenStacks.clear();
	}

	/**
	 * Gets the current regen system configuration.
	 */
	getConfig() {
		return {
			tickInterval: this.tickInterval,
			isActive: this.isActive,
			totalStacks: Array.from(this.regenStacks.values())
				.reduce((total, stacks) => total + stacks.length, 0)
		};
	}
}
