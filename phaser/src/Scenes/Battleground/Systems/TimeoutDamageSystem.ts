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
	private lastTimeoutDamageTick: number = 0;
	private combatStartTime: number = 0;
	private isActive: boolean = false;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
	}

	/**
	 * Initializes the timeout damage system for a new combat.
	 */
	initialize(): void {
		this.combatStartTime = this.scene.time.now;
		this.lastTimeoutDamageTick = 0;
		this.isActive = true;
	}

	/**
	 * Updates the timeout damage system. Should be called every frame during combat.
	 * @param playerForce The player's force
	 * @param cpuForce The CPU's force
	 */
	update(playerForce: Force, cpuForce: Force): void {
		if (!this.isActive) return;

		const currentTime = this.scene.time.now;
		const combatElapsed = currentTime - this.combatStartTime;

		// Check if we've passed the timeout threshold
		if (combatElapsed >= this.timeoutDamageStartTime) {
			const timeSinceTimeoutStarted = combatElapsed - this.timeoutDamageStartTime;
			const timeSinceLastTick = currentTime - this.lastTimeoutDamageTick;

			// Apply damage every second
			if (timeSinceLastTick >= this.timeoutDamageInterval) {
				this.applyTimeoutDamage(playerForce, cpuForce, timeSinceTimeoutStarted);
				this.lastTimeoutDamageTick = currentTime;
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
			combatElapsed: this.isActive ? this.scene.time.now - this.combatStartTime : 0,
		};
	}
}
