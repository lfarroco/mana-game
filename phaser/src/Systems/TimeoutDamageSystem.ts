import * as Force from "@Models/Entities/Force";
import * as CoreConstants from "@Core/Constants";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as Logger from "@Utils/Logger";
import * as State from "@Models/State";

const logger = Logger.createLogger("TimeoutDamageSystem");

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

export function updateTimeoutDamageSystem(
	env: CombatTypes.CombatEnvironment,
	timeoutState: TimeoutSystemState,
	state: State.State,
	playerForce: Force.Force,
	cpuForce: Force.Force,
	delta: number
): TimeoutSystemState {
	if (!timeoutState.isActive) return timeoutState;

	const newCombatElapsedTime = timeoutState.combatElapsedTime + delta;
	const newTimeSinceLastTick = timeoutState.timeSinceLastTick + delta;

	if (newCombatElapsedTime < CoreConstants.TIMEOUT_DAMAGE_START_TIME) {
		return {
			...timeoutState,
			combatElapsedTime: newCombatElapsedTime,
			timeSinceLastTick: newTimeSinceLastTick,
		};
	}

	const timeSinceTimeoutStarted = newCombatElapsedTime - CoreConstants.TIMEOUT_DAMAGE_START_TIME;

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
	if (!stormStarted && newCombatElapsedTime >= CoreConstants.TIMEOUT_DAMAGE_START_TIME) {
		stormStarted = true;
		env.logger.log({
			type: "storm_start",
			frame: env.logger.getCurrentFrame(),
		});
	}

	return {
		...timeoutState,
		combatElapsedTime: newCombatElapsedTime,
		timeSinceLastTick: newTimeSinceLastTick,
		stormStarted,
	};
}

function applyTimeoutDamage(
	env: CombatTypes.CombatEnvironment,
	state: State.State,
	playerForce: Force.Force,
	cpuForce: Force.Force,
	timeSinceTimeoutStarted: number
): void {
	const tickCount = Math.floor(timeSinceTimeoutStarted / TIMEOUT_DAMAGE_INTERVAL_MS) + 1;
	const currentDamage = Math.floor(TIMEOUT_BASE_DAMAGE * Math.pow(TIMEOUT_GROWTH_RATE, tickCount - 1));

	logger.debug(`[TimeoutDamageSystem] Timeout damage tick: ${currentDamage} damage to both forces`);

	// Apply damage immediately (no callback indirection)
	Force.applyDamageToForce(
		state,
		playerForce,
		currentDamage,
		0,
		"timeout",
		false,
	);
	Force.applyDamageToForce(
		state,
		cpuForce,
		currentDamage,
		0,
		"timeout",
		false,
	);

	// Log the timeout damage for playback
	env.logger.log({
		type: "timeout_damage",
		frame: env.logger.getCurrentFrame(),
		force: playerForce.id,
		damage: currentDamage,
		duration: 0,
		applyTime: env.logger.getCurrentFrame(),
	});
	env.logger.log({
		type: "timeout_damage",
		frame: env.logger.getCurrentFrame(),
		force: cpuForce.id,
		damage: currentDamage,
		duration: 0,
		applyTime: env.logger.getCurrentFrame(),
	});
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
		timeoutDamageStartTime: CoreConstants.TIMEOUT_DAMAGE_START_TIME,
		timeoutDamageInterval: TIMEOUT_DAMAGE_INTERVAL_MS,
		isActive: timeoutState.isActive,
		combatElapsed: timeoutState.combatElapsedTime,
		stormState: {
			stormStarted: timeoutState.combatElapsedTime >= CoreConstants.TIMEOUT_DAMAGE_START_TIME,
		},
	};
}