import { applyDamageToForce, Force } from "@Models/Entities/Force";
// Removed browser-specific imports

import { State } from "@Models/State";
import { TIMEOUT_DAMAGE_START_TIME } from "@Constants/constants";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

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

// spawnStar function removed, logic moved to BrowserCombatEffects

export function updateTimeoutDamageSystem(
	env: CombatEnvironment,
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
		applyTimeoutDamage(env, state, playerForce, cpuForce, timeSinceTimeoutStarted);
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
	env: CombatEnvironment,
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

	const effects = env.effects;

	const hitEffect = (force: Force) => () => {
		applyDamageToForce(state, force, currentDamage, 0, "timeout", false, env.effects, env.combatStates.forceStatsState);
	};

	if (effects.onTimeoutDamageVisual) {
		effects.onTimeoutDamageVisual(playerForce.id, currentDamage, hitEffect(playerForce));
		effects.onTimeoutDamageVisual(cpuForce.id, currentDamage, hitEffect(cpuForce));
	} else {
		hitEffect(playerForce)();
		hitEffect(cpuForce)();
	}
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
