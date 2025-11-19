import { applyDamageToForce, Force } from "@Models/Entities/Force";
import { arcaneMissileTargeted } from "../../../Effects";
import { getCore } from "@Models/Entities/Card";
import { getCharaById, shake } from "@Systems/Chara/Chara";
import { MIDDLE_SCREEN } from "@Constants/constants";

const timeoutDamageStartTime = 10000;
const timeoutDamageInterval = 1000;

let combatElapsedTime = 0;
let timeSinceLastTick = 0;
let timeSinceLastStarSpawn = 0;
let isActive = false;

export function initializeTimeoutDamageSystem(): void {
	combatElapsedTime = 0;
	timeSinceLastTick = 0;
	timeSinceLastStarSpawn = 0;
	isActive = true;
}

async function spawnStar(damage: number, targetForce: Force) {
	const target = getCore(targetForce.id);

	const core = getCharaById(target.id);

	// purple -> gold colors for the projectile
	const colors = [0x800080, 0xda70d6, 0xffd700];

	arcaneMissileTargeted(MIDDLE_SCREEN, core, {
		colors,
		amplitudeMin: 10,
		amplitudeMax: 30,
		particleScale: 2.2,
		speedMultiplier: 1.6,
		impact: {
			colors: [0x000000, 0x223322],
			scale: 4.5,
			speed: 240,
			lifespan: 380,
			alpha: 0.6,
		},
		onHit: () => {
			// Apply damage when the shooting star hits the bar
			applyDamageToForce(targetForce, damage, 0, "timeout");
			shake(core);
		},
	});
}

export function updateTimeoutDamageSystem(
	playerForce: Force,
	cpuForce: Force,
	delta: number
): void {
	if (!isActive) return;

	combatElapsedTime += delta;
	timeSinceLastTick += delta;
	timeSinceLastStarSpawn += delta;

	if (combatElapsedTime < timeoutDamageStartTime) return;

	const timeSinceTimeoutStarted = combatElapsedTime - timeoutDamageStartTime;

	if (timeSinceLastTick >= timeoutDamageInterval) {
		applyTimeoutDamage(playerForce, cpuForce, timeSinceTimeoutStarted);
		timeSinceLastTick = 0;
	}
}

function applyTimeoutDamage(
	playerForce: Force,
	cpuForce: Force,
	timeSinceTimeoutStarted: number
): void {
	const tickCount = Math.floor(timeSinceTimeoutStarted / timeoutDamageInterval) + 1;
	const currentDamage = tickCount * 5;

	console.log(
		`[TimeoutDamageSystem] Timeout damage tick ${tickCount}: ${currentDamage} damage to both forces`
	);

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
		stormState: {
			stormStarted: combatElapsedTime >= timeoutDamageStartTime,
		},
	};
}
