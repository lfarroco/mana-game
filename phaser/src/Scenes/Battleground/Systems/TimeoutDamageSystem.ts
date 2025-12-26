import { applyDamageToForce, Force } from "@Models/Entities/Force";
import { arcaneMissileTargeted } from "../../../Effects";
import { getBattleCore } from "@Models/Entities/Card";
import { getCharaById, shake } from "@Systems/Chara/Chara";
import { MIDDLE_SCREEN, TIMEOUT_DAMAGE_START_TIME } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { State } from "@Models/State";

const timeoutDamageInterval = 1000;

export type TimeoutSystemState = {
	combatElapsedTime: number;
	timeSinceLastTick: number;
	isActive: boolean;
};

export function initializeTimeoutDamageSystem(): TimeoutSystemState {
	return {
		combatElapsedTime: 0,
		timeSinceLastTick: 0,
		isActive: true,
	};
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
			applyDamageToForce(state, targetForce, damage, 0, "timeout");
			shake(core);
		},
	});
}

export function updateTimeoutDamageSystem(
	timeoutState: TimeoutSystemState,
	state: State,
	playerForce: Force,
	cpuForce: Force,
	delta: number
): TimeoutSystemState {
	if (!timeoutState.isActive) return timeoutState;

	const newCombatElapsedTime = timeoutState.combatElapsedTime + delta;
	const newTimeSinceLastTick = timeoutState.timeSinceLastTick + delta;

	if (newCombatElapsedTime < TIMEOUT_DAMAGE_START_TIME) {
		return {
			...timeoutState,
			combatElapsedTime: newCombatElapsedTime,
			timeSinceLastTick: newTimeSinceLastTick,
		};
	}

	const timeSinceTimeoutStarted = newCombatElapsedTime - TIMEOUT_DAMAGE_START_TIME;

	if (newTimeSinceLastTick >= timeoutDamageInterval) {
		applyTimeoutDamage(state, playerForce, cpuForce, timeSinceTimeoutStarted);
		return {
			...timeoutState,
			combatElapsedTime: newCombatElapsedTime,
			timeSinceLastTick: 0,
		};
	}

	return {
		...timeoutState,
		combatElapsedTime: newCombatElapsedTime,
		timeSinceLastTick: newTimeSinceLastTick,
	};
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

export function stopTimeoutDamageSystem(timeoutState: TimeoutSystemState): TimeoutSystemState {
	return {
		...timeoutState,
		isActive: false,
	};
}

export function onTimeoutDamageCombatEnd(timeoutState: TimeoutSystemState): TimeoutSystemState {
	return timeoutState.isActive ? { ...timeoutState, isActive: false } : timeoutState;
}

export function getTimeoutDamageConfig(timeoutState: TimeoutSystemState) {
	return {
		timeoutDamageStartTime: TIMEOUT_DAMAGE_START_TIME,
		timeoutDamageInterval,
		isActive: timeoutState.isActive,
		combatElapsed: timeoutState.combatElapsedTime,
		stormState: {
			stormStarted: timeoutState.combatElapsedTime >= TIMEOUT_DAMAGE_START_TIME,
		},
	};
}
