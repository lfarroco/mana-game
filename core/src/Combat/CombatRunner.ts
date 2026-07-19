import { CombatEnvironment, CombatState, SessionData, Unit } from "../Models";
import * as TriggerSystem from "../TriggerSystem/TriggerSystem";
import * as Constants from "../Constants";
import * as Timeout from "./TimeoutDamageSystem";
import * as Poison from "./PoisonDamageSystem";
import * as Regen from "./RegenSystem";
import * as CombatStatsTracker from "./CombatStatsTracker";
import * as StatusEffectSystem from "./StatusEffectSystem";
import * as CombatLogger from "./CombatLogger";
import * as ScheduledEffects from "./ScheduledEffects";

// import * as BlackHoleState from "./BlackHoleState";
// import * as CountdownTimer from "@Systems/CountdownTimer";

const MAX_COMBAT_DURATION_MS = 120_000;

export type CombatRunner = {
	updateFrame: (state: CombatState, time: number, delta: number) => void;
	// TOOD: redundant, maybe move outcome to combatstate
	finishCombat: (outcome: "player_won" | "player_lost" | "both_won") => Promise<void>;
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
	const playerCore = state.units.find(
		(u) => u.force === Constants.FORCE_ID_PLAYER && u.isCore,
	);
	const cpuCore = state.units.find(
		(u) => u.force === Constants.FORCE_ID_CPU && u.isCore,
	);

	const playerDead = !playerCore || playerCore.life <= 0;
	const cpuDead = !cpuCore || cpuCore.life <= 0;

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

/**
 * Server-side combat simulation runner.
 * All visual effects are no-ops — they are handled separately by CombatPlaybackController
 * during client-side playback of the combat logs.
 */
export const runCombat = (
	session: SessionData,
	combatState: CombatState,
): CombatRunner => {
	// const blackHoleState: BlackHoleState.BlackHoleState | null = null;
	// const countdownTimerState: CountdownTimer.CountdownTimerState | null = null;

	const env: CombatEnvironment = {
		session,
		combatState: combatState,
		logger: CombatLogger.createCombatLogger(),
		scheduledEffects: ScheduledEffects.initialize(),
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

	const finishCombat = async (
		outcome: "player_won" | "player_lost" | "both_won"
	) => {
		if (!runnerState.active) return;

		runnerState.active = false;

		// TODO: reimplement me
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

		// Log outcome
		runnerState.env.logger.log({
			type: "outcome",
			result: outcome,
		});

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