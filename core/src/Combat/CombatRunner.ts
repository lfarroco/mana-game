import { CombatEnvironment, CombatState, SessionData, Unit, DeferredEvent } from "../Models";
import * as TriggerSystem from "../TriggerSystem/TriggerSystem";
import * as Constants from "../Constants";
import * as Timeout from "./TimeoutDamageSystem";
import * as Poison from "./PoisonDamageSystem";
import * as Regen from "./RegenSystem";
import * as CombatStatsTracker from "./CombatStatsTracker";
import * as StatusEffectSystem from "./StatusEffectSystem";
import * as CombatLogger from "./CombatLogger";

// import * as BlackHoleState from "./BlackHoleState";
// import * as CountdownTimer from "@Systems/CountdownTimer";

const MAX_COMBAT_DURATION_MS = 120_000;

export type CombatRunner = {
	updateFrame: (state: CombatState, time: number, delta: number) => void;
	// FIXME: outcome is duplicated — finishCombat already receives it as arg.
	// Consider moving outcome into CombatState instead.
	finishCombat: (outcome: "player_won" | "player_lost" | "both_won") => void;
	isActive: () => boolean;
	stop: () => void;
	getEnv: () => CombatEnvironment;
};

type CombatRunnerState = {
	active: boolean;
	env: CombatEnvironment;
	// countdownTimerState: CountdownTimer.CountdownTimerState | null;
	// blackHoleState: BlackHoleState.BlackHoleState | null;
};

/**
 * Check if combat should end based on core life totals.
 */
const checkCombatOutcome = (state: CombatState): "player_won" | "player_lost" | "both_won" | null => {
	const playerCore = state.playerCore;
	const cpuCore = state.cpuCore;

	const playerDead = playerCore.life <= 0;
	const cpuDead = cpuCore.life <= 0;

	if (playerDead && cpuDead) {
		return "both_won";
	}
	if (playerDead) {
		return "player_lost";
	}
	if (cpuDead) {
		return "player_won";
	}

	return null;
};

export const runCombat = (
	session: SessionData,
	combatState: CombatState,
): CombatRunner => {
	// const blackHoleState: BlackHoleState.BlackHoleState | null = null;
	// const countdownTimerState: CountdownTimer.CountdownTimerState | null = null;

	// The session.seed is advanced during combat and saved back 
	// after simulation completes (see CombatSimulation.ts).
	const env: CombatEnvironment = {
		seed: session.seed,
		combatState: combatState,
		logger: CombatLogger.createCombatLogger(),
		deferredEvents: [],
		combatStates: {
			poisonSystemState: Poison.initializePoisonSystem(),
			regenSystemState: Regen.initializeRegenSystem(),
			combatStatsTrackerState: CombatStatsTracker.initialize(combatState),
		},
	};

	const runnerState: CombatRunnerState = {
		active: true,
		env,
		// countdownTimerState,
		// blackHoleState,
	};

	combatState.units.forEach((unit) => {
		const battleStartReactions = unit.reactions.filter((reaction) => reaction.effectId === "on_battle_start");
		battleStartReactions.forEach((reaction) => {
			TriggerSystem.processEffectsIO(
				env,
				unit,
				reaction.effects,
				true,
			);
		});
	});

	let statusEffectSystemState = StatusEffectSystem.initialize(combatState);
	let timeoutSystemState = Timeout.initializeTimeoutDamageSystem();
	let combatElapsedMs = 0;

	const updateFrame = (nextState: CombatState, _time: number, delta: number): void => {
		if (!runnerState.active) return;

		runnerState.env.combatState = nextState;

		const scaledDelta = delta;
		combatElapsedMs += scaledDelta;

		runnerState.env.logger.setCurrentTimeMs(combatElapsedMs);

		// 0. Max duration check — first thing, before any damage, so
		//    cores that survived all previous frames get both_won
		if (combatElapsedMs >= MAX_COMBAT_DURATION_MS) {
			finishCombat("both_won");
			return;
		}

		// 1. Process deferred events that are due (projectiles landing this frame)
		const dueEvents: DeferredEvent[] = [];
		const remainingEvents: DeferredEvent[] = [];
		for (const event of runnerState.env.deferredEvents) {
			if (event.timeMs <= combatElapsedMs) {
				dueEvents.push(event);
			} else {
				remainingEvents.push(event);
			}
		}
		// Sort due events by time for deterministic processing
		dueEvents.sort((a, b) => a.timeMs - b.timeMs);
		runnerState.env.deferredEvents = remainingEvents;
		for (const event of dueEvents) {
			event.execute(runnerState.env);
		}

		// 2. Check combat outcome after hits landed
		const hitOutcome = checkCombatOutcome(nextState);
		if (hitOutcome) {
			finishCombat(hitOutcome);
			return;
		}

		// 3. Charge units and process effects (these log _cast and schedule _hit)
		const unitsReadyToAct = chargeUnits(
			nextState,
			scaledDelta,
			runnerState.env.logger,
		);

		for (const unit of unitsReadyToAct) {
			CombatStatsTracker.trackAction(runnerState.env.combatStates.combatStatsTrackerState, {
				unit,
			});
			TriggerSystem.processEffectsIO(env, unit, unit.effects, false);
		}

		// 4. Status effects tick (poison/regen)
		statusEffectSystemState = StatusEffectSystem.update(env, statusEffectSystemState, scaledDelta);

		// 5. Max duration check — before timeout damage so both cores alive = both_won
		if (combatElapsedMs >= MAX_COMBAT_DURATION_MS) {
			finishCombat("both_won");
			return;
		}

		// 6. Timeout damage (storm)
		timeoutSystemState = Timeout.updateTimeoutDamageSystem(
			env,
			timeoutSystemState,
			scaledDelta
		);

		// 7. Check combat outcome after status effects and timeout damage
		const tickOutcome = checkCombatOutcome(nextState);
		if (tickOutcome) {
			finishCombat(tickOutcome);
			return;
		}
	};

	const finishCombat = (
		outcome: "player_won" | "player_lost" | "both_won"
	) => {
		if (!runnerState.active) return;

		runnerState.active = false;

		// FIXME: CombatStatsTracker.stop() is needed to persist combat stats into
		// the session runStats after combat ends.
		// CombatStatsTracker.stop(
		// 	runnerState.env.combatStates.combatStatsTrackerState,
		// 	session,
		// );

		timeoutSystemState = Timeout.stopTimeoutDamageSystem(timeoutSystemState);
		timeoutSystemState = Timeout.onTimeoutDamageCombatEnd(timeoutSystemState);

		// Log combat stats before outcomeA
		// TOOD: include this in the outcome
		if (runnerState.env.combatStates?.combatStatsTrackerState) {
			const { unitStats, currentCombatStats } = runnerState.env.combatStates.combatStatsTrackerState;
			runnerState.env.logger.log({
				type: "combat_stats",
				unitStats: Array.from(unitStats.entries()),
				currentCombatStats: Array.from(currentCombatStats.entries()),
			});
		}

		// Log outcome — use current time so sorting keeps it last
		const currentTime = runnerState.env.logger.getCurrentTimeMs();
		runnerState.env.logger.log({
			type: "outcome",
			result: outcome,
		}, currentTime);

	};

	return {
		updateFrame,
		finishCombat,
		isActive: () => runnerState.active,
		stop: () => {
			runnerState.active = false;
		},
		getEnv: () => runnerState.env,
	};
};

export const chargeUnits = (
	state: CombatState,
	delta: number,
	logger: CombatLogger.CombatLogger,
): Unit[] => {
	const performingUnits: Unit[] = [];

	for (const unit of state.units) {
		const cooldownMultiplier =
			unit.hasted > 0 && unit.slowed > 0 ? 1 : unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
		const chargeRate = 1 / cooldownMultiplier;

		unit.charge += delta * chargeRate;

		const wasHasted = unit.hasted > 0;
		const wasSlowed = unit.slowed > 0;

		if (unit.hasted > 0) {
			unit.hasted = Math.max(0, unit.hasted - delta);
		}

		if (unit.slowed > 0) {
			unit.slowed = Math.max(0, unit.slowed - delta);
		}

		if (logger && wasHasted && unit.hasted <= 0) {
			logger.log({ type: "haste_end", unitId: unit.id });
		}

		if (logger && wasSlowed && unit.slowed <= 0) {
			logger.log({ type: "slow_end", unitId: unit.id });
		}

		unit.refresh = Math.max(0, unit.refresh - delta);

		if (unit.charge >= unit.cooldown && unit.refresh === 0) {
			unit.charge = unit.charge - unit.cooldown;
			unit.refresh = Constants.MIN_COOLDOWN;
			performingUnits.push(unit);
		}
	}

	return performingUnits;
};