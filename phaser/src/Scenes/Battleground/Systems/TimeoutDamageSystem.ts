import { applyDamageToForce, Force } from "@Models/Entities/Force";

const timeoutDamageStartTime = 10000;
const timeoutDamageInterval = 1000;

let combatElapsedTime = 0;
let timeSinceLastTick = 0;
let isActive = false;

export function initializeTimeoutDamageSystem(): void {
	combatElapsedTime = 0;
	timeSinceLastTick = 0;
	isActive = true;
}

function spawnStar(damage: number, targetForce: Force): void {
	// Apply damage directly without animation
	applyDamageToForce(targetForce, damage, 0, 'timeout');
}

export function updateTimeoutDamageSystem(playerForce: Force, cpuForce: Force, delta: number): void {
	if (!isActive) return;

	combatElapsedTime += delta;
	timeSinceLastTick += delta;

	if (combatElapsedTime < timeoutDamageStartTime) return;

	const timeSinceTimeoutStarted = combatElapsedTime - timeoutDamageStartTime;

	if (timeSinceLastTick >= timeoutDamageInterval) {
		applyTimeoutDamage(playerForce, cpuForce, timeSinceTimeoutStarted);
		timeSinceLastTick = 0;
	}
}

function applyTimeoutDamage(playerForce: Force, cpuForce: Force, timeSinceTimeoutStarted: number): void {
	const tickCount = Math.floor(timeSinceTimeoutStarted / timeoutDamageInterval) + 1;
	const currentDamage = tickCount;

	console.log(`[TimeoutDamageSystem] Timeout damage tick ${tickCount}: ${currentDamage} damage to both forces`);

	// Launch targeted shooting stars for each force that apply damage on hit
	spawnStar(currentDamage, playerForce);
	spawnStar(currentDamage, cpuForce);
}

export function stopTimeoutDamageSystem(): void {
	isActive = false;
}

export function onTimeoutDamageCombatEnd(): void {
	if (isActive) isActive = false;
}

export function getTimeoutDamageConfig() {
	return {
		timeoutDamageStartTime,
		timeoutDamageInterval,
		isActive,
		combatElapsed: combatElapsedTime,
	};
}

