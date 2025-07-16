import { BattlegroundScene } from "../BattlegroundScene";
import { applyDamageToForce, Force } from "../../../Models/Entities/Force";

/**
 * System that applies escalating damage to both forces after a timeout period
 * to prevent indefinite defensive battles.
 */
export class TimeoutDamageSystem {
	private scene: BattlegroundScene;

	// Timeout damage configuration
	private readonly timeoutDamageStartTime: number = 10000; // 10 seconds in milliseconds
	private readonly timeoutDamageInterval: number = 1000; // 1 second between damage ticks

	// State tracking
	private combatElapsedTime: number = 0; // Track elapsed time using deltas
	private timeSinceLastTick: number = 0; // Time since last damage tick
	private isActive: boolean = false;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
	}

	/**
	 * Initializes the timeout damage system for a new combat.
	 */
	initialize(): void {
		this.combatElapsedTime = 0;
		this.timeSinceLastTick = 0;
		this.isActive = true;
	}

	/**
	 * Updates the timeout damage system. Should be called every frame during combat.
	 * @param playerForce The player's force
	 * @param cpuForce The CPU's force
	 * @param delta The time delta since last update in milliseconds
	 */
	update(playerForce: Force, cpuForce: Force, delta: number): void {
		if (!this.isActive) return;

		// Update elapsed time using delta
		this.combatElapsedTime += delta;
		this.timeSinceLastTick += delta;

		// Check if we've passed the timeout threshold
		if (this.combatElapsedTime >= this.timeoutDamageStartTime) {
			const timeSinceTimeoutStarted = this.combatElapsedTime - this.timeoutDamageStartTime;

			// Apply damage every interval
			if (this.timeSinceLastTick >= this.timeoutDamageInterval) {
				this.applyTimeoutDamage(playerForce, cpuForce, timeSinceTimeoutStarted);
				this.timeSinceLastTick = 0; // Reset the tick timer
			}
		}
	}

	/**
	 * Applies escalating timeout damage to both forces.
	 * @param playerForce The player's force
	 * @param cpuForce The CPU's force
	 * @param timeSinceTimeoutStarted Time elapsed since timeout damage began
	 */
	private applyTimeoutDamage(playerForce: Force, cpuForce: Force, timeSinceTimeoutStarted: number): void {
		// Calculate current damage amount (starts at 1, increases each tick)
		const tickCount = Math.floor(timeSinceTimeoutStarted / this.timeoutDamageInterval) + 1;
		const currentDamage = tickCount;

		// Apply damage to both forces (shields absorb damage first)
		console.log(`[TimeoutDamageSystem] Timeout damage tick ${tickCount}: ${currentDamage} damage to both forces`);

		applyDamageToForce(playerForce, currentDamage, this.scene);
		applyDamageToForce(cpuForce, currentDamage, this.scene);
	}

	/**
	 * Stops the timeout damage system.
	 */
	stop(): void {
		this.isActive = false;
	}

	/**
	 * Gets the current timeout damage configuration.
	 */
	getConfig() {
		return {
			timeoutDamageStartTime: this.timeoutDamageStartTime,
			timeoutDamageInterval: this.timeoutDamageInterval,
			isActive: this.isActive,
			combatElapsed: this.combatElapsedTime,
		};
	}
}
