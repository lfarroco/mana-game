import { applyDamageToForce, Force } from "@Models/Entities/Force";
import { arcaneMissileTargeted } from "../../../Effects";
import { getBattleCore } from "@Models/Entities/Card";
import { getCharaById, shake } from "@Systems/Chara/Chara";
import { MIDDLE_SCREEN, TIMEOUT_DAMAGE_START_TIME } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { State } from "@Models/State";


const timeoutDamageInterval = 1000;

let combatElapsedTime = 0;
let timeSinceLastTick = 0;
let isActive = false;

export function initializeTimeoutDamageSystem(): void {
	combatElapsedTime = 0;
	timeSinceLastTick = 0;
	isActive = true;
}

async function spawnStar(state: State, damage: number, targetForce: Force) {
	const target = getBattleCore(state)(targetForce.id);

	const core = getCharaById(target.id);

	const colors = [0x000000];

	playSoundEffect('sfx_voidhunter_attack_impact');

	arcaneMissileTargeted(MIDDLE_SCREEN, core, {
		colors,
		blendMode: Phaser.BlendModes.NORMAL,
		onHit: () => {
			// Apply damage when the shooting star hits the bar
			applyDamageToForce(targetForce, damage, 0, "timeout");
			shake(core);
		},
	});
}

export function updateTimeoutDamageSystem(
	state: State,
	playerForce: Force,
	cpuForce: Force,
	delta: number
): void {
	if (!isActive) return;

	combatElapsedTime += delta;
	timeSinceLastTick += delta;

	if (combatElapsedTime < TIMEOUT_DAMAGE_START_TIME) return;

	const timeSinceTimeoutStarted = combatElapsedTime - TIMEOUT_DAMAGE_START_TIME;

	if (timeSinceLastTick >= timeoutDamageInterval) {
		applyTimeoutDamage(state, playerForce, cpuForce, timeSinceTimeoutStarted);
		timeSinceLastTick = 0;
	}
}

function applyTimeoutDamage(
	state: State,
	playerForce: Force,
	cpuForce: Force,
	timeSinceTimeoutStarted: number
): void {
	let currentDamage: number;

	if (timeSinceTimeoutStarted >= 60000) {
		currentDamage = Infinity;
	} else {
		const tickCount = Math.floor(timeSinceTimeoutStarted / timeoutDamageInterval) + 1;
		currentDamage = Math.floor(5 * Math.pow(1.2, tickCount - 1));
	}

	console.log(
		`[TimeoutDamageSystem] Timeout damage tick: ${currentDamage} damage to both forces`
	);

	// Launch targeted shooting stars for each force that apply damage on hit
	spawnStar(state, currentDamage, playerForce);
	spawnStar(state, currentDamage, cpuForce);
}

export function stopTimeoutDamageSystem(): void {
	isActive = false;
}

export function onTimeoutDamageCombatEnd(): void {
	if (isActive) isActive = false;
}

export function getTimeoutDamageConfig() {
	return {
		timeoutDamageStartTime: TIMEOUT_DAMAGE_START_TIME,
		timeoutDamageInterval,
		isActive,
		combatElapsed: combatElapsedTime,
		stormState: {
			stormStarted: combatElapsedTime >= TIMEOUT_DAMAGE_START_TIME,
		},
	};
}
