import { BattlegroundScene } from "../BattlegroundScene";
import { applyDamageToForce, Force } from "../../../Models/Entities/Force";

/**
 * Represents a cloud sprite with its animation properties
 */
interface CloudSprite {
	sprite: Phaser.GameObjects.Image;
	speed: number;
	depth: number;
}

/**
 * System that applies escalating damage to both forces after a timeout period
 * to prevent indefinite defensive battles. Also manages storm visual effects.
 */
export class TimeoutDamageSystem {
	private scene: BattlegroundScene;

	// Timeout damage configuration
	private readonly timeoutDamageStartTime: number = 10000; // 10 seconds in milliseconds
	private readonly timeoutDamageInterval: number = 1000; // 1 second between damage ticks

	// Storm visual configuration
	private readonly cloudSpawnInterval: number = 2000; // 2 seconds between new cloud spawns
	private readonly maxClouds: number = 10; // Maximum number of clouds on screen
	private readonly minCloudSpeed: number = 50; // Minimum cloud movement speed
	private readonly maxCloudSpeed: number = 150; // Maximum cloud movement speed

	// State tracking
	private combatElapsedTime: number = 0; // Track elapsed time using deltas
	private timeSinceLastTick: number = 0; // Time since last damage tick
	private timeSinceLastCloudSpawn: number = 0; // Time since last cloud spawn
	private isActive: boolean = false;

	// Cloud management
	private clouds: CloudSprite[] = [];
	private stormContainer?: Phaser.GameObjects.Container;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
	}

	/**
	 * Initializes the timeout damage system for a new combat.
	 */
	initialize(): void {
		this.combatElapsedTime = 0;
		this.timeSinceLastTick = 0;
		this.timeSinceLastCloudSpawn = 0;
		this.isActive = true;
		this.setupStormContainer();
	}

	/**
	 * Sets up the container for storm visual effects.
	 */
	private setupStormContainer(): void {
		// Clean up any existing storm container
		if (this.stormContainer) {
			this.stormContainer.destroy();
		}

		// Create new storm container above background but below UI
		this.stormContainer = this.scene.add.container(0, 0);
		this.stormContainer.setDepth(10); // Above background but below most UI elements

		// Clear any existing clouds
		this.clouds = [];
	}

	/**
	 * Creates a new cloud sprite and starts its animation.
	 */
	private spawnCloud(): void {
		if (!this.stormContainer || this.clouds.length >= this.maxClouds) {
			return;
		}

		// Choose random cloud image
		const cloudNumber = Phaser.Math.Between(1, 7);
		const cloudKey = `cloud_${cloudNumber.toString().padStart(3, '0')}`;

		// Get screen dimensions
		const screenWidth = this.scene.scale.width;
		const screenHeight = this.scene.scale.height;

		// Create cloud sprite at origin first to get its dimensions
		const cloud = this.scene.add.image(0, 0, cloudKey);

		// Set random scale and transparency for depth variation - bigger clouds with 3x base scale
		const scale = Phaser.Math.FloatBetween(2.5, 3.5); // 3x bigger than before
		const alpha = Phaser.Math.FloatBetween(0.15, 0.4); // More transparent
		cloud.setScale(scale);
		cloud.setAlpha(alpha);

		// Tint with sandy/dusty color
		cloud.setTint(0xD4A574); // Sandy brown color

		// Get the actual display size after scaling
		const cloudWidth = cloud.displayWidth;
		const cloudHeight = cloud.displayHeight;

		// Position cloud completely off-screen to the right using actual dimensions
		const startX = screenWidth + cloudWidth / 2; // Start off-screen accounting for cloud width
		const endX = -cloudWidth / 2; // End off-screen on the left
		const yPosition = Phaser.Math.Between(cloudHeight / 2, screenHeight - cloudHeight / 2);

		// Position the cloud off-screen
		cloud.setPosition(startX, yPosition);

		// Random movement speed based on depth (closer clouds move faster)
		const speed = Phaser.Math.Between(this.minCloudSpeed, this.maxCloudSpeed) * scale;
		const depth = Math.floor(scale * 100); // Use scale as depth indicator

		// Add to storm container
		this.stormContainer.add(cloud);

		// Store cloud data
		const cloudSprite: CloudSprite = {
			sprite: cloud,
			speed: speed,
			depth: depth
		};
		this.clouds.push(cloudSprite);

		// Animate cloud moving left across screen
		this.scene.tweens.add({
			targets: cloud,
			x: endX, // Move completely off-screen to the left
			duration: (startX - endX) / speed * 1000, // Duration based on total distance and speed
			ease: 'Linear',
			onComplete: () => {
				// Remove cloud from tracking array when animation completes
				const index = this.clouds.indexOf(cloudSprite);
				if (index > -1) {
					this.clouds.splice(index, 1);
				}
				cloud.destroy();
			}
		});
	}

	/**
	 * Updates storm intensity based on time elapsed since timeout started.
	 */
	private updateStormIntensity(timeSinceTimeoutStarted: number): void {
		// Calculate how many clouds should be spawning based on time
		// Start with 3-4 clouds, gradually increase to max
		const baseCloudCount = 3;
		const maxAdditionalClouds = this.maxClouds - baseCloudCount;
		const intensityFactor = Math.min(timeSinceTimeoutStarted / 20000, 1); // Reach max intensity after 20 seconds
		const targetCloudCount = baseCloudCount + Math.floor(maxAdditionalClouds * intensityFactor);

		// Adjust spawn frequency based on intensity
		const currentSpawnInterval = Math.max(
			this.cloudSpawnInterval * (1 - intensityFactor * 0.7), // Reduce interval by up to 70%
			500 // Minimum spawn interval of 500ms
		);

		// Spawn clouds if we need more and enough time has passed
		if (this.clouds.length < targetCloudCount && this.timeSinceLastCloudSpawn >= currentSpawnInterval) {
			this.spawnCloud();
			this.timeSinceLastCloudSpawn = 0;
		}
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
		this.timeSinceLastCloudSpawn += delta;

		// Check if we've passed the timeout threshold
		if (this.combatElapsedTime >= this.timeoutDamageStartTime) {
			const timeSinceTimeoutStarted = this.combatElapsedTime - this.timeoutDamageStartTime;

			// Start storm effects when timeout begins
			this.updateStormIntensity(timeSinceTimeoutStarted);

			// Apply damage every interval
			if (this.timeSinceLastTick >= this.timeoutDamageInterval) {
				this.applyTimeoutDamage(playerForce, cpuForce, timeSinceTimeoutStarted);
				this.timeSinceLastTick = 0; // Reset the tick timer
			}
		} else {
			// Before timeout starts, spawn initial clouds occasionally for atmosphere
			if (this.timeSinceLastCloudSpawn >= this.cloudSpawnInterval * 2) {
				if (this.clouds.length < 2 && Math.random() < 0.3) { // 30% chance to spawn atmospheric cloud
					this.spawnCloud();
					this.timeSinceLastCloudSpawn = 0;
				}
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

		applyDamageToForce(playerForce, currentDamage, this.scene, 0, "timeout");
		applyDamageToForce(cpuForce, currentDamage, this.scene, 0, "timeout");
	}

	/**
	 * Stops the timeout damage system and cleans up storm effects.
	 */
	stop(): void {
		this.isActive = false;
		this.fadeOutStormEffects();
	}

	/**
	 * Triggers immediate fade-out of storm effects when combat ends.
	 * This should be called when victory/defeat is determined.
	 */
	onCombatEnd(): void {
		if (this.isActive) {
			this.fadeOutStormEffects();
		}
	}

	/**
	 * Fades out all storm visual effects gradually when combat ends.
	 */
	private fadeOutStormEffects(): void {
		if (!this.stormContainer || this.clouds.length === 0) {
			this.cleanupStormEffects();
			return;
		}

		// Fade out all existing clouds
		this.clouds.forEach((cloudSprite, index) => {
			// Stop the existing movement tween
			this.scene.tweens.killTweensOf(cloudSprite.sprite);

			// Create fade out tween with slight delay for each cloud
			this.scene.tweens.add({
				targets: cloudSprite.sprite,
				alpha: 0,
				duration: 1500, // 1.5 seconds fade
				delay: index * 100, // Stagger the fade for each cloud
				ease: 'Power2.Out',
				onComplete: () => {
					cloudSprite.sprite.destroy();
					// Remove from tracking array
					const cloudIndex = this.clouds.indexOf(cloudSprite);
					if (cloudIndex > -1) {
						this.clouds.splice(cloudIndex, 1);
					}

					// Clean up container when all clouds are gone
					if (this.clouds.length === 0) {
						this.cleanupStormContainer();
					}
				}
			});
		});
	}

	/**
	 * Cleans up all storm visual effects immediately.
	 */
	private cleanupStormEffects(): void {
		// Stop all cloud animations and destroy sprites
		this.clouds.forEach(cloudSprite => {
			this.scene.tweens.killTweensOf(cloudSprite.sprite);
			cloudSprite.sprite.destroy();
		});
		this.clouds = [];

		this.cleanupStormContainer();
	}

	/**
	 * Destroys the storm container.
	 */
	private cleanupStormContainer(): void {
		// Destroy storm container
		if (this.stormContainer) {
			this.stormContainer.destroy();
			this.stormContainer = undefined;
		}
	}

	/**
	 * Gets the current timeout damage configuration and storm state.
	 */
	getConfig() {
		return {
			timeoutDamageStartTime: this.timeoutDamageStartTime,
			timeoutDamageInterval: this.timeoutDamageInterval,
			isActive: this.isActive,
			combatElapsed: this.combatElapsedTime,
			stormState: {
				cloudsActive: this.clouds.length,
				maxClouds: this.maxClouds,
				stormStarted: this.combatElapsedTime >= this.timeoutDamageStartTime
			}
		};
	}
}
