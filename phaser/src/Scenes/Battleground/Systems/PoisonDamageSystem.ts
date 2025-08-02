import { BattlegroundScene } from "../BattlegroundScene";
import { applyDamageToForce, Force } from "../../../Models/Entities/Force";
import { poisonEffect } from "../../../Effects/poisonEffect";
import { getMoraleBarPosition } from "../MoraleDisplay";

/**
 * Represents a poison stack on a force
 */
export type PoisonStack = {
	initialAmount: number; // Starting damage amount
	remainingAmount: number; // Current damage amount (decreases by 1 each tick)
	timeSinceLastTick: number; // Time since last damage application
	sourceUnitId?: string; // ID of the unit that applied this poison
};

/**
 * System that manages poison damage over time for forces
 * Poison decreases by 1 damage each second until it reaches 0
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
	 * @param amount Initial poison damage amount
	 * @param sourceUnitId Optional ID of the unit applying poison
	 */
	applyPoison(targetForce: Force, amount: number, sourceUnitId?: string): void {
		if (amount <= 0) return;

		const forceId = targetForce.id;
		if (!this.poisonStacks.has(forceId)) {
			this.poisonStacks.set(forceId, []);
		}

		const stacks = this.poisonStacks.get(forceId)!;

		// Add new poison stack
		stacks.push({
			initialAmount: amount,
			remainingAmount: amount,
			timeSinceLastTick: 0,
			sourceUnitId
		});

		console.log(`[PoisonDamageSystem] Applied ${amount} poison to force ${forceId}`);

		// Show poison effect at force position
		this.showPoisonEffect(targetForce);
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
				// Apply poison damage
				const damage = stack.remainingAmount;
				console.log(`[PoisonDamageSystem] Poison tick on ${forceId}: ${damage} damage`);

				applyDamageToForce(force, damage, this.scene);

				// Show poison effect
				this.showPoisonEffect(force);

				// Decrease poison amount for next tick
				stack.remainingAmount = Math.max(0, stack.remainingAmount - 1);
				stack.timeSinceLastTick = 0;

				// Remove stack if poison is depleted
				if (stack.remainingAmount <= 0) {
					stacks.splice(i, 1);
					console.log(`[PoisonDamageSystem] Poison stack expired for force ${forceId}`);
				}
			}
		}
	}

	/**
	 * Shows poison visual effect at the force's morale bar position
	 * @param force The force to show effect for
	 */
	private showPoisonEffect(force: Force): void {
		const moraleBarPos = getMoraleBarPosition(force.id);
		if (moraleBarPos) {
			// Show poison effect slightly above the morale bar
			poisonEffect(this.scene, {
				x: moraleBarPos.x + 50, // Center of bar area
				y: moraleBarPos.y - 20 // Above the bar
			}, {
				duration: 800,
				intensity: 1.2
			});
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

		// Calculate total damage from all stacks
		// Each stack deals damage equal to: sum from 1 to remainingAmount
		return stacks.reduce((total, stack) => {
			// Poison damage formula: n + (n-1) + (n-2) + ... + 1 = n*(n+1)/2
			const remaining = stack.remainingAmount;
			return total + (remaining * (remaining + 1)) / 2;
		}, 0);
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
