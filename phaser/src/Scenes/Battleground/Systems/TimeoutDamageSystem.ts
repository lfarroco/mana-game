import { scene } from "../BattlegroundScene";
import { applyDamageToForce, Force } from "@Models/Entities/Force";
import { arcaneMissileTargeted } from '../../../Effects';
import * as Systems from "../Systems";
import { getCore } from "@Models/Entities/Card";
import { getCharaById } from "@Systems/Chara/Chara";

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
	if (!scene) return;

	const screenWidth = scene.scale.width;
	const timerCircle = Systems.CountdownTimer.getCircle();
	const startX = timerCircle ? timerCircle.x : Math.floor(screenWidth / 2);
	const startY = timerCircle ? timerCircle.y : -40;

	const target = getCore(targetForce.id)

	// purple -> gold colors for the projectile
	const colors = [0x800080, 0xDA70D6, 0xFFD700];

	arcaneMissileTargeted(
		{ x: startX, y: startY },
		getCharaById(target.id),
		{
			colors,
			amplitudeMin: 10,
			amplitudeMax: 20,
			particleScale: 1.2,
			speedMultiplier: 1.6,
			impact: {
				colors: [0xFFD700, 0xFFF5E1],
				scale: 2.5,
				speed: 240,
				lifespan: 380,
				alpha: 0.6
			},
			onHit: () => {
				// Apply damage when the shooting star hits the bar
				applyDamageToForce(targetForce, damage, 0, 'timeout');
			}
		}
	);
}

export function updateTimeoutDamageSystem(playerForce: Force, cpuForce: Force, delta: number): void {
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
		stormState: {
			stormStarted: combatElapsedTime >= timeoutDamageStartTime
		}
	};
}

