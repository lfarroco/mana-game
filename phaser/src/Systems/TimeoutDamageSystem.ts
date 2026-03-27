import { applyDamageToForce, Force } from "@Models/Entities/Force";
// Removed browser-specific imports

import { State } from "@Models/State";
import { TIMEOUT_DAMAGE_START_TIME } from "@Constants/constants";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("TimeoutDamageSystem");

const TIMEOUT_DAMAGE_INTERVAL_MS = 1000;
const TIMEOUT_BASE_DAMAGE = 5;
const TIMEOUT_GROWTH_RATE = 1.2;

export type TimeoutSystemState = {
	combatElapsedTime: number;
	timeSinceLastTick: number;
	isActive: boolean;
	stormStarted: boolean;
};

export function initializeTimeoutDamageSystem(): TimeoutSystemState {
	return {
		combatElapsedTime: 0,
		timeSinceLastTick: 0,
		isActive: true,
		stormStarted: false,
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

	if (newTimeSinceLastTick >= TIMEOUT_DAMAGE_INTERVAL_MS) {
		applyTimeoutDamage(env, state, playerForce, cpuForce, timeSinceTimeoutStarted);
		return {
			...timeoutState,
			combatElapsedTime: newCombatElapsedTime,
			timeSinceLastTick: 0,
		};
	}

	// Check for storm start
	let stormStarted = timeoutState.stormStarted;
	if (!stormStarted && newCombatElapsedTime >= TIMEOUT_DAMAGE_START_TIME) {
		stormStarted = true;
		if (env.effects.onTimeoutStart) {
			env.effects.onTimeoutStart();
		}
	}

	return {
		...timeoutState,
		combatElapsedTime: newCombatElapsedTime,
		timeSinceLastTick: newTimeSinceLastTick,
		stormStarted,
	};
}

function applyTimeoutDamage(
	env: CombatEnvironment,
	state: State,
	playerForce: Force,
	cpuForce: Force,
	timeSinceTimeoutStarted: number
): void {
	const tickCount = Math.floor(timeSinceTimeoutStarted / TIMEOUT_DAMAGE_INTERVAL_MS) + 1;
	const currentDamage = Math.floor(TIMEOUT_BASE_DAMAGE * Math.pow(TIMEOUT_GROWTH_RATE, tickCount - 1));

	logger.debug(`[TimeoutDamageSystem] Timeout damage tick: ${currentDamage} damage to both forces`);

	const effects = env.effects;

	const hitEffect = (force: Force) => () => {
		applyDamageToForce(
			state,
			force,
			currentDamage,
			0,
			"timeout",
			false,
			env.effects,
			env.combatStates.forceStatsState
		);
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
		timeoutDamageInterval: TIMEOUT_DAMAGE_INTERVAL_MS,
		isActive: timeoutState.isActive,
		combatElapsed: timeoutState.combatElapsedTime,
		stormState: {
			stormStarted: timeoutState.combatElapsedTime >= TIMEOUT_DAMAGE_START_TIME,
		},
	};
}
