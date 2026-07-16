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
import * as ForceStatsState from "@Core/Combat/ForceStatsState";
import * as CombatLogger from "@Core/Combat/CombatLogger";

const logger = Logger.createLogger("RunCombatCore");

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
		combatStates: {
			poisonSystemState: Poison.initializePoisonSystem(),
			regenSystemState: Regen.initializeRegenSystem(),
			combatStatsTrackerState: CombatStatsTracker.initialize(state),
			forceStatsState: ForceStatsState.initializeForceStatsState(),
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

		// Update logger frame for pure-data log entries
		const LOGGER_FRAME_DURATION = 16.67;
		runnerState.env.logger.setFrame(Math.floor(combatElapsedMs / LOGGER_FRAME_DURATION));
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

		statusEffectSystemState = StatusEffectSystem.update(env, statusEffectSystemState, scaledDelta);

		timeoutSystemState = Timeout.updateTimeoutDamageSystem(
			env,
			timeoutSystemState,
			nextState,
			Force.playerForce(nextState),
			Force.cpuForce(nextState),
			scaledDelta
		);

		if (combatElapsedMs >= MAX_COMBAT_DURATION_MS) {
			finishCombat(nextState, "both_won");
			return;
		}

		const playerCore = Card.getBattleCore(nextState)(CombatConstants.FORCE_ID_PLAYER);
		const cpuCore = Card.getBattleCore(nextState)(CombatConstants.FORCE_ID_CPU);
		const playerLifeZero = !playerCore || playerCore.life <= 0;
		const cpuLifeZero = !cpuCore || cpuCore.life <= 0;
		const outcome: "player_won" | "player_lost" | "both_won" | null =
			cpuLifeZero && playerLifeZero
				? "both_won"
				: cpuLifeZero
					? "player_won"
					: playerLifeZero
						? "player_lost"
						: null;

		if (outcome) {
			finishCombat(nextState, outcome);
		}
	};

	const finishCombat = async (
		nextState: State.State,
		outcome: "player_won" | "player_lost" | "both_won"
	) => {
		if (!runnerState.active) return;

		runnerState.active = false;

		StatusEffectSystem.stop(statusEffectSystemState);
		CombatStatsTracker.stop(runnerState.env.combatStates.combatStatsTrackerState, nextState);

		timeoutSystemState = Timeout.stopTimeoutDamageSystem(timeoutSystemState);
		timeoutSystemState = Timeout.onTimeoutDamageCombatEnd(timeoutSystemState);

		// Log combat stats before outcome
		if (runnerState.env.combatStates?.combatStatsTrackerState) {
			const { unitStats, currentCombatStats } = runnerState.env.combatStates.combatStatsTrackerState;
			runnerState.env.logger.log({
				type: "combat_stats",
				unitStats: Array.from(unitStats.entries()),
				currentCombatStats: Array.from(currentCombatStats.entries()),
				frame: runnerState.env.logger.getCurrentFrame(),
			});
		}

		// Log outcome
		runnerState.env.logger.log({
			type: "outcome",
			result: outcome,
			frame: runnerState.env.logger.getCurrentFrame(),
		});

		logger.debug("[RunCombatSystem] Combat ended. Outcome:", outcome);
	};

	return {
		updateFrame,
		finishCombat,
		isActive: () => runnerState.active,
		stop: () => {
			logger.debug("[RunCombatCore] Stopping combat");
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