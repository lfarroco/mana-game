import { State } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import { processEffectsIO, processReactions } from "@TriggerSystem/TriggerSystem";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import { FORCE_ID_PLAYER, FORCE_ID_CPU, MIN_COOLDOWN } from "@Core/Combat/CombatConstants";
import * as Timeout from "@Systems/TimeoutDamageSystem";
import * as Poison from "@Systems/PoisonDamageSystem";
import * as Regen from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as StatusEffectSystem from "@Systems/StatusEffectSystem";
import { getBattleCore } from "@Models/Entities/Card";
import { CombatEffects, CombatEnvironment } from "@Core/Combat/CombatTypes";
import { BlackHoleState } from "@Core/Combat/BlackHoleState";
import { CountdownTimerState } from "@Systems/CountdownTimer";
import { createLogger } from "@Utils/Logger";
import { initializeForceStatsState } from "@Core/Combat/ForceStatsState";

const logger = createLogger("RunCombatCore");

export type { WaveOutcome, CombatEffects } from "@Core/Combat/CombatTypes";

const MAX_COMBAT_DURATION_MS = 120_000;

export type CombatRunner = {
	updateFrame: (state: State, time: number, delta: number) => void;
	finishCombat: (state: State, outcome: "player_won" | "player_lost" | "both_won") => Promise<void>;
	isActive: () => boolean;
	stop: () => void;
	getEnv: () => CombatEnvironment;
};

type CombatRunnerState = {
	active: boolean;
	env: CombatEnvironment;
	countdownTimerState: CountdownTimerState | null;
	blackHoleState: BlackHoleState | null;
};

// TODO: make effects optional, for server-side runs
export const runCombat = (state: State, effects: CombatEffects): CombatRunner => {
	const blackHoleState = effects.initBlackHole ? effects.initBlackHole() : null;
	let countdownTimerState = effects.initCountdownTimer
		? effects.initCountdownTimer(blackHoleState)
		: null;

	if (countdownTimerState && effects.startCountdownTimer) {
		countdownTimerState = effects.startCountdownTimer(countdownTimerState);
	}

	const env: CombatEnvironment = {
		state,
		effects,
		combatStates: {
			poisonSystemState: Poison.initializePoisonSystem(),
			regenSystemState: Regen.initializeRegenSystem(),
			combatStatsTrackerState: CombatStatsTracker.initialize(state),
			forceStatsState: effects.initForceStats
				? effects.initForceStats()
				: initializeForceStatsState(),
		},
		processReactions,
	};

	const runnerState: CombatRunnerState = {
		active: true,
		env,
		countdownTimerState,
		blackHoleState,
	};

	[FORCE_ID_PLAYER, FORCE_ID_CPU].forEach((forceId) => {
		const core = getBattleCore(state)(forceId);
		if (!core) {
			return;
		}

		effects.updateLifeDisplay(
			forceId,
			core.life,
			0,
			runnerState.env.combatStates.forceStatsState
		);
		effects.updateShieldDisplay(
			forceId,
			core.shield,
			0,
			runnerState.env.combatStates.forceStatsState
		);
		effects.updateRegenDisplay(
			forceId,
			Regen.getRegenRate(runnerState.env.combatStates.regenSystemState, forceId),
			0
		);
		effects.updatePoisonDisplay(
			forceId,
			Poison.getPoisonRate(runnerState.env.combatStates.poisonSystemState, forceId),
			0
		);
	});

	state.battleData.units.forEach((unit) => {
		const battleStartReactions = unit.reactions.filter((reaction) => reaction.effectId === "on_battle_start");
		battleStartReactions.forEach((reaction) => {
			processEffectsIO(env, unit, reaction.effects, true);
		});
	});

	let statusEffectSystemState = StatusEffectSystem.initialize(state);
	let timeoutSystemState = Timeout.initializeTimeoutDamageSystem();
	let combatElapsedMs = 0;

	const updateFrame = (nextState: State, _time: number, delta: number): void => {
		if (!runnerState.active) return;

		runnerState.env.state = nextState;

		const scaledDelta = delta * effects.getTimeScale();
		combatElapsedMs += scaledDelta;
		const unitsReadyToAct = chargeUnits(
			nextState,
			scaledDelta,
			effects.onChargeBarUpdate,
			effects.onHasteEnd,
			effects.onSlowEnd
		);

		for (const unit of unitsReadyToAct) {
			effects.onUnitPop(unit.id);

			CombatStatsTracker.trackAction(runnerState.env.combatStates.combatStatsTrackerState, {
				unit,
			});
			processEffectsIO(env, unit, unit.effects, false);
		}

		statusEffectSystemState = StatusEffectSystem.update(env, statusEffectSystemState, scaledDelta);

		timeoutSystemState = Timeout.updateTimeoutDamageSystem(
			env,
			timeoutSystemState,
			nextState,
			playerForce(nextState),
			cpuForce(nextState),
			scaledDelta
		);

		if (combatElapsedMs >= MAX_COMBAT_DURATION_MS) {
			finishCombat(nextState, "both_won");
			return;
		}

		const playerCore = getBattleCore(nextState)(FORCE_ID_PLAYER);
		const cpuCore = getBattleCore(nextState)(FORCE_ID_CPU);
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
		nextState: State,
		outcome: "player_won" | "player_lost" | "both_won"
	) => {
		if (!runnerState.active) return;

		runnerState.active = false;

		StatusEffectSystem.stop(statusEffectSystemState);
		CombatStatsTracker.stop(runnerState.env.combatStates.combatStatsTrackerState, nextState);

		timeoutSystemState = Timeout.stopTimeoutDamageSystem(timeoutSystemState);
		timeoutSystemState = Timeout.onTimeoutDamageCombatEnd(timeoutSystemState);

		logger.debug("[RunCombatSystem] Combat ended. Outcome:", outcome);
		await effects.onCombatEnd(nextState, outcome, runnerState.env.combatStates);
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
	state: State,
	delta: number,
	onChargeBarUpdate: (unitId: string) => void,
	onHasteEnd?: (unitId: string) => void,
	onSlowEnd?: (unitId: string) => void
): Unit[] => {
	const performingUnits: Unit[] = [];

	for (const unit of state.battleData.units) {
		const cooldownMultiplier =
			unit.hasted > 0 && unit.slowed > 0 ? 1 : unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
		const chargeRate = 1 / cooldownMultiplier;

		unit.charge += delta * chargeRate;

		if (unit.hasted > 0) {
			const previousHasted = unit.hasted;
			unit.hasted = Math.max(0, unit.hasted - delta);
			if (previousHasted > 0 && unit.hasted === 0 && onHasteEnd) {
				onHasteEnd(unit.id);
			}
		}

		if (unit.slowed > 0) {
			const previousSlowed = unit.slowed;
			unit.slowed = Math.max(0, unit.slowed - delta);
			if (previousSlowed > 0 && unit.slowed === 0 && onSlowEnd) {
				onSlowEnd(unit.id);
			}
		}

		unit.refresh = Math.max(0, unit.refresh - delta);

		if (unit.charge >= unit.cooldown && unit.refresh === 0) {
			unit.charge = unit.charge - unit.cooldown;
			unit.refresh = MIN_COOLDOWN;
			performingUnits.push(unit);
		}

		onChargeBarUpdate(unit.id);
	}

	return performingUnits;
};