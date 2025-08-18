import { scene } from "../BattlegroundScene";
import { applyDamageToForce, Force } from "../../../Models/Entities/Force";

interface CloudSprite {
	sprite: Phaser.GameObjects.Image;
	speed: number;
	depth: number;
}

const timeoutDamageStartTime = 30000;
const timeoutDamageInterval = 1000;

const cloudSpawnInterval = 2000;
const maxClouds = 10;
const minCloudSpeed = 50;
const maxCloudSpeed = 150;

let combatElapsedTime = 0;
let timeSinceLastTick = 0;
let timeSinceLastCloudSpawn = 0;
let isActive = false;

let clouds: CloudSprite[] = [];
let stormContainer: Phaser.GameObjects.Container | undefined;

export function initializeTimeoutDamageSystem(): void {
	combatElapsedTime = 0;
	timeSinceLastTick = 0;
	timeSinceLastCloudSpawn = 0;
	isActive = true;
	setupStormContainer();
}

function setupStormContainer(): void {

	if (stormContainer) {
		stormContainer.destroy();
	}

	stormContainer = scene.add.container(0, 0);
	stormContainer.setDepth(10);

	clouds = [];
}

function spawnCloud(): void {
	if (!stormContainer || clouds.length >= maxClouds) return;

	const cloudNumber = Phaser.Math.Between(1, 7);
	const cloudKey = `cloud_${cloudNumber.toString().padStart(3, '0')}`;

	const screenWidth = scene.scale.width;
	const screenHeight = scene.scale.height;

	const cloud = scene.add.image(0, 0, cloudKey);

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

	const speed = Phaser.Math.Between(minCloudSpeed, maxCloudSpeed) * scale;
	const depth = Math.floor(scale * 100);

	stormContainer.add(cloud);

	const cloudSprite: CloudSprite = { sprite: cloud, speed, depth };
	clouds.push(cloudSprite);

	scene.tweens.add({
		targets: cloud,
		x: endX,
		duration: (startX - endX) / speed * 1000,
		ease: 'Linear',
		onComplete: () => {
			const index = clouds.indexOf(cloudSprite);
			if (index > -1) clouds.splice(index, 1);
			cloud.destroy();
		}
	});
}

function updateStormIntensity(timeSinceTimeoutStarted: number): void {
	const baseCloudCount = 3;
	const maxAdditionalClouds = maxClouds - baseCloudCount;
	const intensityFactor = Math.min(timeSinceTimeoutStarted / 20000, 1);
	const targetCloudCount = baseCloudCount + Math.floor(maxAdditionalClouds * intensityFactor);

	const currentSpawnInterval = Math.max(
		cloudSpawnInterval * (1 - intensityFactor * 0.7),
		500
	);

	if (clouds.length < targetCloudCount && timeSinceLastCloudSpawn >= currentSpawnInterval) {
		spawnCloud();
		timeSinceLastCloudSpawn = 0;
	}
}

export function updateTimeoutDamageSystem(playerForce: Force, cpuForce: Force, delta: number): void {
	if (!isActive) return;
	if (!scene) return;

	combatElapsedTime += delta;
	timeSinceLastTick += delta;
	timeSinceLastCloudSpawn += delta;

	if (combatElapsedTime >= timeoutDamageStartTime) {
		const timeSinceTimeoutStarted = combatElapsedTime - timeoutDamageStartTime;

		updateStormIntensity(timeSinceTimeoutStarted);

		if (timeSinceLastTick >= timeoutDamageInterval) {
			applyTimeoutDamage(playerForce, cpuForce, timeSinceTimeoutStarted);
			timeSinceLastTick = 0;
		}
	} else {
		if (timeSinceLastCloudSpawn >= cloudSpawnInterval * 2) {
			if (clouds.length < 2 && Math.random() < 0.3) {
				spawnCloud();
				timeSinceLastCloudSpawn = 0;
			}
		}
	}
}

function applyTimeoutDamage(playerForce: Force, cpuForce: Force, timeSinceTimeoutStarted: number): void {
	const tickCount = Math.floor(timeSinceTimeoutStarted / timeoutDamageInterval) + 1;
	const currentDamage = tickCount;

	console.log(`[TimeoutDamageSystem] Timeout damage tick ${tickCount}: ${currentDamage} damage to both forces`);

	applyDamageToForce(playerForce, currentDamage, 0, "timeout");
	applyDamageToForce(cpuForce, currentDamage, 0, "timeout");
}

export function stopTimeoutDamageSystem(): void {
	isActive = false;
	fadeOutStormEffects();
}

export function onTimeoutDamageCombatEnd(): void {
	if (isActive) fadeOutStormEffects();
}

function fadeOutStormEffects(): void {
	if (!scene) return;
	if (!stormContainer || clouds.length === 0) {
		cleanupStormEffects();
		return;
	}

	clouds.forEach((cloudSprite, index) => {
		scene!.tweens.killTweensOf(cloudSprite.sprite);

		scene!.tweens.add({
			targets: cloudSprite.sprite,
			alpha: 0,
			duration: 1500,
			delay: index * 100,
			ease: 'Power2.Out',
			onComplete: () => {
				cloudSprite.sprite.destroy();
				const cloudIndex = clouds.indexOf(cloudSprite);
				if (cloudIndex > -1) clouds.splice(cloudIndex, 1);

				if (clouds.length === 0) cleanupStormContainer();
			}
		});
	});
}

function cleanupStormEffects(): void {
	if (!scene) return;
	clouds.forEach(cloudSprite => {
		scene!.tweens.killTweensOf(cloudSprite.sprite);
		cloudSprite.sprite.destroy();
	});
	clouds = [];
	cleanupStormContainer();
}

function cleanupStormContainer(): void {
	if (stormContainer) {
		stormContainer.destroy();
		stormContainer = undefined;
	}
}

export function getTimeoutDamageConfig() {
	return {
		timeoutDamageStartTime,
		timeoutDamageInterval,
		isActive,
		combatElapsed: combatElapsedTime,
		stormState: {
			cloudsActive: clouds.length,
			maxClouds,
			stormStarted: combatElapsedTime >= timeoutDamageStartTime
		}
	};
}

