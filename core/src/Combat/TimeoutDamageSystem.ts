import * as Force from "../Entities/Force";
import * as Constants from "../math/Constants";
import * as Card from "../Entities/Card";
import { CombatEnvironment } from "../Models";


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
	env: CombatEnvironment,
	timeoutState: TimeoutSystemState,
	delta: number
): TimeoutSystemState {
	if (!timeoutState.isActive) return timeoutState;

	const newCombatElapsedTime = timeoutState.combatElapsedTime + delta;
	const newTimeSinceLastTick = timeoutState.timeSinceLastTick + delta;

	if (newCombatElapsedTime < Constants.TIMEOUT_DAMAGE_START_TIME) {
		return {
			...timeoutState,
			combatElapsedTime: newCombatElapsedTime,
			timeSinceLastTick: newTimeSinceLastTick,
		};
	}

	const timeSinceTimeoutStarted = newCombatElapsedTime - Constants.TIMEOUT_DAMAGE_START_TIME;

	if (newTimeSinceLastTick >= TIMEOUT_DAMAGE_INTERVAL_MS) {
		applyTimeoutDamage(env, timeSinceTimeoutStarted);
		return {
			...timeoutState,
			combatElapsedTime: newCombatElapsedTime,
			timeSinceLastTick: 0,
		};
	}

	// Check for storm start
	let stormStarted = timeoutState.stormStarted;
	if (!stormStarted && newCombatElapsedTime >= Constants.TIMEOUT_DAMAGE_START_TIME) {
		stormStarted = true;
		env.logger.log({
			type: "storm_start",
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
	env: CombatEnvironment,
	timeSinceTimeoutStarted: number
): void {
	const tickCount = Math.floor(timeSinceTimeoutStarted / TIMEOUT_DAMAGE_INTERVAL_MS) + 1;
	const currentDamage = Math.floor(TIMEOUT_BASE_DAMAGE * Math.pow(TIMEOUT_GROWTH_RATE, tickCount - 1));

	const travelTime = 400;
	const currentTimeMs = env.logger.getCurrentTimeMs();

	// Log cast entries
	env.logger.log({
		type: "timeout_damage_cast",
		force: Constants.FORCE_ID_PLAYER,
		damage: currentDamage,
		travelTime,
	});
	env.logger.log({
		type: "timeout_damage_cast",
		force: Constants.FORCE_ID_CPU,
		damage: currentDamage,
		travelTime,
	});

	// Schedule the hits as deferred events
	env.deferredEvents.push({
		timeMs: currentTimeMs + travelTime,
		execute: (env) => {
			const playerCore = Card.getBattleCore(env.combatState)(Constants.FORCE_ID_PLAYER);
			const cpuCore = Card.getBattleCore(env.combatState)(Constants.FORCE_ID_CPU);

			const oldPlayerLife = playerCore?.life ?? 0;
			const oldPlayerShield = playerCore?.shield ?? 0;
			const oldCpuLife = cpuCore?.life ?? 0;
			const oldCpuShield = cpuCore?.shield ?? 0;

			Force.applyDamageToForce(
				env.combatState,
				Constants.FORCE_ID_PLAYER,
				currentDamage,
				0,
				"timeout",
				false,
			);
			Force.applyDamageToForce(
				env.combatState,
				Constants.FORCE_ID_CPU,
				currentDamage,
				0,
				"timeout",
				false,
			);

			env.logger.log({
				type: "timeout_damage_hit",
				force: Constants.FORCE_ID_PLAYER,
				damage: currentDamage,
				newLife: playerCore?.life,
				newShield: playerCore?.shield,
				lifeDelta: (playerCore?.life ?? 0) - oldPlayerLife,
				shieldDelta: (playerCore?.shield ?? 0) - oldPlayerShield,
			});
			env.logger.log({
				type: "timeout_damage_hit",
				force: Constants.FORCE_ID_CPU,
				damage: currentDamage,
				newLife: cpuCore?.life,
				newShield: cpuCore?.shield,
				lifeDelta: (cpuCore?.life ?? 0) - oldCpuLife,
				shieldDelta: (cpuCore?.shield ?? 0) - oldCpuShield,
			});
		},
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
		timeoutDamageStartTime: Constants.TIMEOUT_DAMAGE_START_TIME,
		timeoutDamageInterval: TIMEOUT_DAMAGE_INTERVAL_MS,
		isActive: timeoutState.isActive,
		combatElapsed: timeoutState.combatElapsedTime,
		stormState: {
			stormStarted: timeoutState.combatElapsedTime >= Constants.TIMEOUT_DAMAGE_START_TIME,
		},
	};
}