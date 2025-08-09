import { BattlegroundScene } from "../BattlegroundScene";
import { applyDamageToForce, Force } from "../../../Models/Entities/Force";

/**
 * Represents a poison stack on a force
 */
export type PoisonStack = {
	totalDamage: number; // Total damage this poison will deal
	damagePerTick: number; // Damage dealt per tick
	remainingDamage: number; // Remaining damage to be dealt
	timeSinceLastTick: number; // Time since last damage application
	sourceUnitId?: string; // ID of the unit that applied this poison
};

/**
 * System that manages poison damage over time for forces
 * Poison deals consistent damage per second until total damage is reached
 * Damage per tick = max(1, floor(totalDamage / 10))
 */
export class PoisonDamageSystem {
	private scene: BattlegroundScene;
	private readonly tickInterval: number = 1000; // 1 second between poison ticks
	private isActive: boolean = false;

	// Poison stacks for each force
	private poisonStacks: Map<string, PoisonStack[]> = new Map();

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
	}

	/**
	 * Initializes the poison damage system for a new combat.
	 */
	initialize(): void {
		this.isActive = true;
		this.poisonStacks.clear();
	}

	/**
	 * Applies poison to a target force
	 * @param targetForce The force to poison
	 * @param amount Total poison damage to deal over time
	 * @param sourceUnitId Optional ID of the unit applying poison
	 */
	applyPoison(targetForce: Force, amount: number, sourceUnitId?: string): void {
		if (amount <= 0) return;

		const forceId = targetForce.id;
		if (!this.poisonStacks.has(forceId)) {
			this.poisonStacks.set(forceId, []);
		}

		const stacks = this.poisonStacks.get(forceId)!;

		// Calculate damage per tick: 1 damage per tick for every 10 power
		// Minimum 1 damage per tick, deals total damage over time
		const damagePerTick = Math.max(1, Math.floor(amount / 10));

		// Add new poison stack
		stacks.push({
			totalDamage: amount,
			damagePerTick: damagePerTick,
			remainingDamage: amount,
			timeSinceLastTick: 0,
			sourceUnitId
		});

		const ticksRequired = Math.ceil(amount / damagePerTick);
		console.log(`[PoisonDamageSystem] Applied ${amount} poison to force ${forceId} (${damagePerTick} per tick, ${ticksRequired} ticks)`);

		// Note: Removed poison effect display for consistency with other damage types
	}

	/**
	 * Updates the poison damage system. Should be called every frame during combat.
	 * @param playerForce The player's force
	 * @param cpuForce The CPU's force
	 * @param delta The time delta since last update in milliseconds
	 */
	update(playerForce: Force, cpuForce: Force, delta: number): void {
		if (!this.isActive) return;

		// Update poison for both forces
		this.updateForcePoison(playerForce, delta);
		this.updateForcePoison(cpuForce, delta);
	}

	/**
	 * Updates poison stacks for a specific force
	 * @param force The force to update
	 * @param delta Time delta in milliseconds
	 */
	private updateForcePoison(force: Force, delta: number): void {
		const forceId = force.id;
		const stacks = this.poisonStacks.get(forceId);

		if (!stacks || stacks.length === 0) return;

		// Update each poison stack
		for (let i = stacks.length - 1; i >= 0; i--) {
			const stack = stacks[i];
			stack.timeSinceLastTick += delta;

			// Check if it's time for a poison tick
			if (stack.timeSinceLastTick >= this.tickInterval) {
				// Apply poison damage (consistent amount per tick)
				const damage = Math.min(stack.damagePerTick, stack.remainingDamage);
				console.log(`[PoisonDamageSystem] Poison tick on ${forceId}: ${damage} damage (${stack.remainingDamage} remaining)`);

				applyDamageToForce(force, damage, this.scene, 0, "poison");

				// Note: Removed poison effect display for consistency with other damage types

				// Decrease remaining poison damage
				stack.remainingDamage = Math.max(0, stack.remainingDamage - damage);
				stack.timeSinceLastTick = 0;

				// Remove stack if poison is depleted
				if (stack.remainingDamage <= 0) {
					stacks.splice(i, 1);
					console.log(`[PoisonDamageSystem] Poison stack expired for force ${forceId}`);
				}
			}
		}
	}

	/**
	 * Reduces poison stacks based on healing received
	 * For every 10 points healed, removes 2.5 poison damage (rounded down)
	 * @param forceId The force that received healing
	 * @param healAmount The amount healed
	 */
	reducePoison(forceId: string, healAmount: number): void {
		const stacks = this.poisonStacks.get(forceId);
		if (!stacks || stacks.length === 0) return;

		// Calculate poison reduction: 2.5 per 10 healing, rounded down
		const poisonReduction = Math.floor((healAmount / 10) * 2.5);
		if (poisonReduction <= 0) return;

		console.log(`[PoisonDamageSystem] Healing ${healAmount} reduces poison by ${poisonReduction} for force ${forceId}`);

		let remainingReduction = poisonReduction;

		// Reduce poison stacks starting from the most recent (highest index)
		for (let i = stacks.length - 1; i >= 0 && remainingReduction > 0; i--) {
			const stack = stacks[i];
			const reduction = Math.min(remainingReduction, stack.remainingDamage);

			stack.remainingDamage -= reduction;
			remainingReduction -= reduction;

			console.log(`[PoisonDamageSystem] Reduced poison stack ${i} by ${reduction}, now ${stack.remainingDamage} remaining`);

			// Remove stack if completely neutralized
			if (stack.remainingDamage <= 0) {
				stacks.splice(i, 1);
				console.log(`[PoisonDamageSystem] Poison stack ${i} completely neutralized`);
			}
		}

		// Clean up empty stack array
		if (stacks.length === 0) {
			this.poisonStacks.delete(forceId);
		}
	}

	/**
	 * Gets total poison damage that will be applied to a force
	 * @param forceId The force ID to check
	 * @returns Total remaining poison damage
	 */
	getTotalPoisonDamage(forceId: string): number {
		const stacks = this.poisonStacks.get(forceId);
		if (!stacks) return 0;

		// Simply sum all remaining damage from all stacks
		return stacks.reduce((total, stack) => total + stack.remainingDamage, 0);
	}

	/**
	 * Gets current poison stacks for a force
	 * @param forceId The force ID to check
	 * @returns Array of poison stacks
	 */
	getPoisonStacks(forceId: string): PoisonStack[] {
		return this.poisonStacks.get(forceId) || [];
	}

	/**
	 * Clears all poison from a force
	 * @param forceId The force ID to clear
	 */
	clearPoison(forceId: string): void {
		this.poisonStacks.delete(forceId);
	}

	/**
	 * Stops the poison damage system.
	 */
	stop(): void {
		this.isActive = false;
		this.poisonStacks.clear();
	}

	/**
	 * Gets the current poison damage system configuration.
	 */
	getConfig() {
		return {
			tickInterval: this.tickInterval,
			isActive: this.isActive,
			totalStacks: Array.from(this.poisonStacks.values())
				.reduce((total, stacks) => total + stacks.length, 0)
		};
	}
}
