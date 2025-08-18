import { BattlegroundScene } from "../BattlegroundScene";
import { applyDamageToForce, Force } from "../../../Models/Entities/Force";

interface CloudSprite {
	sprite: Phaser.GameObjects.Image;
	speed: number;
	depth: number;
}

export class TimeoutDamageSystem {
	private scene: BattlegroundScene;

	private readonly timeoutDamageStartTime: number = 30000;
	private readonly timeoutDamageInterval: number = 1000;

	private readonly cloudSpawnInterval: number = 2000;
	private readonly maxClouds: number = 10;
	private readonly minCloudSpeed: number = 50;
	private readonly maxCloudSpeed: number = 150;

	private combatElapsedTime: number = 0;
	private timeSinceLastTick: number = 0;
	private timeSinceLastCloudSpawn: number = 0;
	private isActive: boolean = false;

	private clouds: CloudSprite[] = [];
	private stormContainer?: Phaser.GameObjects.Container;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
	}

	initialize(): void {
		this.combatElapsedTime = 0;
		this.timeSinceLastTick = 0;
		this.timeSinceLastCloudSpawn = 0;
		this.isActive = true;
		this.setupStormContainer();
	}

	private setupStormContainer(): void {
		if (this.stormContainer) {
			this.stormContainer.destroy();
		}

		this.stormContainer = this.scene.add.container(0, 0);
		this.stormContainer.setDepth(10);

		this.clouds = [];
	}

	private spawnCloud(): void {
		if (!this.stormContainer || this.clouds.length >= this.maxClouds) {
			return;
		}

		const cloudNumber = Phaser.Math.Between(1, 7);
		const cloudKey = `cloud_${cloudNumber.toString().padStart(3, '0')}`;

		const screenWidth = this.scene.scale.width;
		const screenHeight = this.scene.scale.height;

		const cloud = this.scene.add.image(0, 0, cloudKey);

		const scale = Phaser.Math.FloatBetween(2.5, 3.5);
		const alpha = Phaser.Math.FloatBetween(0.15, 0.4);
		cloud.setScale(scale);
		cloud.setAlpha(alpha);

		cloud.setTint(0xD4A574);

		const cloudWidth = cloud.displayWidth;
		const cloudHeight = cloud.displayHeight;

		const startX = screenWidth + cloudWidth / 2;
		const endX = -cloudWidth / 2;
		const yPosition = Phaser.Math.Between(cloudHeight / 2, screenHeight - cloudHeight / 2);

		cloud.setPosition(startX, yPosition);

		const speed = Phaser.Math.Between(this.minCloudSpeed, this.maxCloudSpeed) * scale;
		const depth = Math.floor(scale * 100);

		this.stormContainer.add(cloud);

		const cloudSprite: CloudSprite = {
			sprite: cloud,
			speed: speed,
			depth: depth
		};
		this.clouds.push(cloudSprite);

		this.scene.tweens.add({
			targets: cloud,
			x: endX,
			duration: (startX - endX) / speed * 1000,
			ease: 'Linear',
			onComplete: () => {
				const index = this.clouds.indexOf(cloudSprite);
				if (index > -1) {
					this.clouds.splice(index, 1);
				}
				cloud.destroy();
			}
		});
	}

	private updateStormIntensity(timeSinceTimeoutStarted: number): void {
		const baseCloudCount = 3;
		const maxAdditionalClouds = this.maxClouds - baseCloudCount;
		const intensityFactor = Math.min(timeSinceTimeoutStarted / 20000, 1);
		const targetCloudCount = baseCloudCount + Math.floor(maxAdditionalClouds * intensityFactor);

		const currentSpawnInterval = Math.max(
			this.cloudSpawnInterval * (1 - intensityFactor * 0.7),
			500
		);

		if (this.clouds.length < targetCloudCount && this.timeSinceLastCloudSpawn >= currentSpawnInterval) {
			this.spawnCloud();
			this.timeSinceLastCloudSpawn = 0;
		}
	}

	update(playerForce: Force, cpuForce: Force, delta: number): void {
		if (!this.isActive) return;

		this.combatElapsedTime += delta;
		this.timeSinceLastTick += delta;
		this.timeSinceLastCloudSpawn += delta;

		if (this.combatElapsedTime >= this.timeoutDamageStartTime) {
			const timeSinceTimeoutStarted = this.combatElapsedTime - this.timeoutDamageStartTime;

			this.updateStormIntensity(timeSinceTimeoutStarted);

			if (this.timeSinceLastTick >= this.timeoutDamageInterval) {
				this.applyTimeoutDamage(playerForce, cpuForce, timeSinceTimeoutStarted);
				this.timeSinceLastTick = 0;
			}
		} else {
			if (this.timeSinceLastCloudSpawn >= this.cloudSpawnInterval * 2) {
				if (this.clouds.length < 2 && Math.random() < 0.3) {
					this.spawnCloud();
					this.timeSinceLastCloudSpawn = 0;
				}
			}
		}
	}

	private applyTimeoutDamage(playerForce: Force, cpuForce: Force, timeSinceTimeoutStarted: number): void {
		const tickCount = Math.floor(timeSinceTimeoutStarted / this.timeoutDamageInterval) + 1;
		const currentDamage = tickCount;

		console.log(`[TimeoutDamageSystem] Timeout damage tick ${tickCount}: ${currentDamage} damage to both forces`);

		applyDamageToForce(playerForce, currentDamage, 0, "timeout");
		applyDamageToForce(cpuForce, currentDamage, 0, "timeout");
	}

	stop(): void {
		this.isActive = false;
		this.fadeOutStormEffects();
	}

	onCombatEnd(): void {
		if (this.isActive) {
			this.fadeOutStormEffects();
		}
	}

	private fadeOutStormEffects(): void {
		if (!this.stormContainer || this.clouds.length === 0) {
			this.cleanupStormEffects();
			return;
		}

		this.clouds.forEach((cloudSprite, index) => {
			this.scene.tweens.killTweensOf(cloudSprite.sprite);

			this.scene.tweens.add({
				targets: cloudSprite.sprite,
				alpha: 0,
				duration: 1500,
				delay: index * 100,
				ease: 'Power2.Out',
				onComplete: () => {
					cloudSprite.sprite.destroy();
					const cloudIndex = this.clouds.indexOf(cloudSprite);
					if (cloudIndex > -1) {
						this.clouds.splice(cloudIndex, 1);
					}

					if (this.clouds.length === 0) {
						this.cleanupStormContainer();
					}
				}
			});
		});
	}

	private cleanupStormEffects(): void {
		this.clouds.forEach(cloudSprite => {
			this.scene.tweens.killTweensOf(cloudSprite.sprite);
			cloudSprite.sprite.destroy();
		});
		this.clouds = [];

		this.cleanupStormContainer();
	}

	private cleanupStormContainer(): void {
		if (this.stormContainer) {
			this.stormContainer.destroy();
			this.stormContainer = undefined;
		}
	}

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
