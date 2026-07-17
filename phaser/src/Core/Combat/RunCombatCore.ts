import * as State from "@Models/State";
import * as Unit from "@Models/Entities/Unit";
import * as TriggerSystem from "@TriggerSystem/TriggerSystem";
import * as Force from "@Models/Entities/Force";
import * as CombatConstants from "@Core/Combat/CombatConstants";
import * as Timeout from "@Systems/TimeoutDamageSystem";
import * as Poison from "@Systems/PoisonDamageSystem";
import * as Regen from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as StatusEffectSystem from "@Systems/StatusEffectSystem";
import * as Card from "@Models/Entities/Card";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as BlackHoleState from "@Core/Combat/BlackHoleState";
import * as CountdownTimer from "@Systems/CountdownTimer";
import * as Logger from "@Utils/Logger";
import * as CombatLogger from "@Core/Combat/CombatLogger";
import * as ScheduledEffects from "@Core/Combat/ScheduledEffects";


export type { WaveOutcome } from "@Core/Combat/CombatTypes";

const MAX_COMBAT_DURATION_MS = 120_000;

export type CombatRunner = {
	updateFrame: (state: State.State, time: number, delta: number) => void;
	finishCombat: (state: State.State, outcome: "player_won" | "player_lost" | "both_won") => Promise<void>;
	isActive: () => boolean;
	stop: () => void;
	getEnv: () => CombatTypes.CombatEnvironment;
};

type CombatRunnerState = {
	active: boolean;
	env: CombatTypes.CombatEnvironment;
	countdownTimerState: CountdownTimer.CountdownTimerState | null;
	blackHoleState: BlackHoleState.BlackHoleState | null;
};

/**
 * Check if combat should end based on core life totals.
 */
const checkCombatOutcome = (state: State.State): "player_won" | "player_lost" | "both_won" | null => {
	const playerCore = Card.getBattleCore(state)(CombatConstants.FORCE_ID_PLAYER);
	const cpuCore = Card.getBattleCore(state)(CombatConstants.FORCE_ID_CPU);
	const playerLifeZero = !playerCore || playerCore.life <= 0;
	const cpuLifeZero = !cpuCore || cpuCore.life <= 0;

	if (cpuLifeZero && playerLifeZero) return "both_won";
	if (cpuLifeZero) return "player_won";
	if (playerLifeZero) return "player_lost";
	return null;
};

/**
 * Server-side combat simulation runner.
 * All visual effects are no-ops — they are handled separately by CombatPlaybackController
 * during client-side playback of the combat logs.
 */
export const runCombat = (state: State.State): CombatRunner => {
	const blackHoleState: BlackHoleState.BlackHoleState | null = null;
	const countdownTimerState: CountdownTimer.CountdownTimerState | null = null;

	const env: CombatTypes.CombatEnvironment = {
		state,
		logger: CombatLogger.createCombatLogger(),
		scheduledEffects: ScheduledEffects.initialize(),
		combatStates: {
			poisonSystemState: Poison.initializePoisonSystem(),
			regenSystemState: Regen.initializeRegenSystem(),
			combatStatsTrackerState: CombatStatsTracker.initialize(state),
		},
		processReactions: TriggerSystem.processReactions,
	};

	const runnerState: CombatRunnerState = {
		active: true,
		env,
		countdownTimerState,
		blackHoleState,
	};

	state.battleData.units.forEach((unit) => {
		const battleStartReactions = unit.reactions.filter((reaction) => reaction.effectId === "on_battle_start");
		battleStartReactions.forEach((reaction) => {
			TriggerSystem.processEffectsIO(env, unit, reaction.effects, true);
		});
	});

	let statusEffectSystemState = StatusEffectSystem.initialize(state);
	let timeoutSystemState = Timeout.initializeTimeoutDamageSystem();
	let combatElapsedMs = 0;

	const updateFrame = (nextState: State.State, _time: number, delta: number): void => {
		if (!runnerState.active) return;

		runnerState.env.state = nextState;

		const scaledDelta = delta;
		combatElapsedMs += scaledDelta;

		runnerState.env.logger.setCurrentTimeMs(combatElapsedMs);

		// 1. Process scheduled hits that are due (projectiles landing this frame)
		const { dueHits, remaining } = ScheduledEffects.getDueHits(
			runnerState.env.scheduledEffects,
			combatElapsedMs,
		);
		runnerState.env.scheduledEffects = remaining;
		for (const hit of dueHits) {
			ScheduledEffects.processHit(runnerState.env, hit);
		}

		// 2. Check combat outcome after hits landed
		const hitOutcome = checkCombatOutcome(nextState);
		if (hitOutcome) {
			finishCombat(nextState, hitOutcome);
			return;
		}

		// 3. Charge units and process effects (these log _cast and schedule _hit)
		const unitsReadyToAct = chargeUnits(
			nextState,
			scaledDelta,
		);

		for (const unit of unitsReadyToAct) {
			CombatStatsTracker.trackAction(runnerState.env.combatStates.combatStatsTrackerState, {
				unit,
			});
			TriggerSystem.processEffectsIO(env, unit, unit.effects, false);
		}

		// 4. Status effects tick (poison/regen)
		statusEffectSystemState = StatusEffectSystem.update(env, statusEffectSystemState, scaledDelta);

		// 5. Timeout damage
		timeoutSystemState = Timeout.updateTimeoutDamageSystem(
			env,
			timeoutSystemState,
			nextState,
			Force.playerForce(nextState),
			Force.cpuForce(nextState),
			scaledDelta
		);

		// 6. Max duration check
		if (combatElapsedMs >= MAX_COMBAT_DURATION_MS) {
			finishCombat(nextState, "both_won");
			return;
		}

		// 7. Check combat outcome after status effects and timeout damage
		const tickOutcome = checkCombatOutcome(nextState);
		if (tickOutcome) {
			finishCombat(nextState, tickOutcome);
			return;
		}
	};

	const finishCombat = async (
		nextState: State.State,
		outcome: "player_won" | "player_lost" | "both_won"
	) => {
		if (!runnerState.active) return;

		runnerState.active = false;

		CombatStatsTracker.stop(runnerState.env.combatStates.combatStatsTrackerState, nextState);

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

		// Log outcome
		runnerState.env.logger.log({
			type: "outcome",
			result: outcome,
		});

		Logger.debug("RunCombatCore", "[RunCombatSystem] Combat ended. Outcome:", outcome);
	};

	return {
		updateFrame,
		finishCombat,
		isActive: () => runnerState.active,
		stop: () => {
			Logger.debug("RunCombatCore", "[RunCombatCore] Stopping combat");
			runnerState.active = false;
		},
		getEnv: () => runnerState.env,
	};
};

export const chargeUnits = (
	state: State.State,
	delta: number,
): Unit.Unit[] => {
	const performingUnits: Unit.Unit[] = [];

	for (const unit of state.battleData.units) {
		const cooldownMultiplier =
			unit.hasted > 0 && unit.slowed > 0 ? 1 : unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
		const chargeRate = 1 / cooldownMultiplier;

		unit.charge += delta * chargeRate;

		if (unit.hasted > 0) {
			unit.hasted = Math.max(0, unit.hasted - delta);
		}

		if (unit.slowed > 0) {
			unit.slowed = Math.max(0, unit.slowed - delta);
		}

		unit.refresh = Math.max(0, unit.refresh - delta);

		if (unit.charge >= unit.cooldown && unit.refresh === 0) {
			unit.charge = unit.charge - unit.cooldown;
			unit.refresh = CombatConstants.MIN_COOLDOWN;
			performingUnits.push(unit);
		}
	}

	return performingUnits;
};