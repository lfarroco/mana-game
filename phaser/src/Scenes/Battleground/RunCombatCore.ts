import { State } from "@Models/State";
import { MIN_COOLDOWN } from "./ServerConstants";
import { Unit } from "@Models/Entities/Unit";
import { processEffectsIO, processReactions } from "../../TriggerSystem/TriggerSystem";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "./ServerConstants";
import * as Timeout from "./Systems/TimeoutDamageSystem";
import * as Poison from "./Systems/PoisonDamageSystem";
import * as Regen from "./Systems/RegenSystem";
import * as CombatStatsTracker from "./Systems/CombatStatsTracker";
import * as StatusEffectSystem from "./Systems/StatusEffectSystem";
import { getBattleCore } from "@Models/Entities/Card";
import { CombatEffects, CombatEnvironment } from "./CombatEnvironment";

export type { WaveOutcome, CombatEffects } from "./CombatEnvironment";

export type CombatRunner = {
	updateFrame: (state: State, time: number, delta: number) => void;
	finishCombat: (state: State, outcome: "player_won" | "player_lost") => Promise<void>;
	isActive: () => boolean;
	getEnv: () => any; // Return generic object to avoid export issues, or explicit CombatEnvironment
};

type CombatRunnerState = {
	active: boolean;
	env: CombatEnvironment;
	countdownTimerState: any;
	blackHoleState: any;
};

export const runCombat = (state: State, effects: CombatEffects): CombatRunner => {

	const blackHoleState = effects.initBlackHole ? effects.initBlackHole() : null;
	const countdownTimerState = effects.initCountdownTimer ? effects.initCountdownTimer(blackHoleState) : null;

	const env: CombatEnvironment = {
		state,
		effects,
		combatStates: {
			poisonSystemState: Poison.initializePoisonSystem(),
			regenSystemState: Regen.initializeRegenSystem(),
			combatStatsTrackerState: CombatStatsTracker.initialize(state),
			forceStatsState: null, // Will be set after initForceStats
		},
		processReactions
	};

	const runnerState: CombatRunnerState = {
		active: true,
		env,
		countdownTimerState,
		blackHoleState,
	};

	runnerState.env.combatStates.forceStatsState = null;

	// 2. Initialize Force Stats (UI)
	const forceStatsState = effects.initForceStats ? effects.initForceStats() : null;
	runnerState.env.combatStates.forceStatsState = forceStatsState;

	// 4. Perform initial stats sync
	if (runnerState.env.combatStates.forceStatsState) {
		const forces = [playerForce(state).id, cpuForce(state).id];
		forces.forEach(forceId => {
			const core = getBattleCore(state)(forceId);
			if (core) {
				effects.updateLifeDisplay(forceId, core.life, 0, runnerState.env.combatStates.forceStatsState);
				effects.updateShieldDisplay(forceId, core.shield, 0, runnerState.env.combatStates.forceStatsState);
				effects.updateRegenDisplay(forceId, Regen.getRegenRate(runnerState.env.combatStates.regenSystemState, forceId), 0);
				effects.updatePoisonDisplay(forceId, Poison.getPoisonRate(runnerState.env.combatStates.poisonSystemState, forceId), 0);
			}
		});
	}

	const allUnits = state.battleData.units;
	allUnits.forEach((unit) => {
		const battleStartReactions = unit.reactions.filter(
			(r) => r.effectId === "on_battle_start"
		);
		battleStartReactions.forEach((r) => {
			processEffectsIO(env, unit, r.effects, true);
		});
	});

	// Initialize local systems not in Env
	let statusEffectSystemState = StatusEffectSystem.initialize(state);
	let timeoutSystemState = Timeout.initializeTimeoutDamageSystem();

	const updateFrame = (state: State, _time: number, delta: number): void => {
		if (!runnerState.active) return;

		// Update state reference
		runnerState.env.state = state;

		const scaledDelta = delta * effects.getTimeScale();

		const unitsReadyToAct = chargeUnits(state, scaledDelta, effects.onChargeBarUpdate);

		for (const unit of unitsReadyToAct) {
			effects.onUnitPop(unit.id);

			CombatStatsTracker.trackAction(runnerState.env.combatStates.combatStatsTrackerState, { unit });
			processEffectsIO(env, unit, unit.effects, false);
		}

		statusEffectSystemState = StatusEffectSystem.update(
			env,
			statusEffectSystemState,
			scaledDelta
		);

		timeoutSystemState = Timeout.updateTimeoutDamageSystem(
			env,
			timeoutSystemState,
			state,
			playerForce(state),
			cpuForce(state),
			scaledDelta,
		);

		const playerCore = getBattleCore(state)(FORCE_ID_PLAYER);
		const cpuCore = getBattleCore(state)(FORCE_ID_CPU);

		const playerLifeZero = !playerCore || playerCore.life <= 0;
		const cpuLifeZero = !cpuCore || cpuCore.life <= 0;

		const outcome: "player_won" | "player_lost" | null = cpuLifeZero
			? "player_won"
			: playerLifeZero
				? "player_lost"
				: null;

		if (outcome) {
			finishCombat(state, outcome);
		}
	};

	const finishCombat = async (state: State, outcome: "player_won" | "player_lost") => {
		if (!runnerState.active) return;

		runnerState.active = false;

		StatusEffectSystem.stop(statusEffectSystemState);

		timeoutSystemState = Timeout.stopTimeoutDamageSystem(timeoutSystemState);
		timeoutSystemState = Timeout.onTimeoutDamageCombatEnd(timeoutSystemState);

		console.log("[RunCombatSystem] Combat ended. Outcome:", outcome);

		// 1. Run combat end effects (visuals, results UI)
		await effects.onCombatEnd(state, outcome, runnerState.env.combatStates);
	};

	const isActive = (): boolean => {
		return runnerState.active;
	};

	const getEnv = () => runnerState.env;

	return {
		updateFrame,
		finishCombat,
		isActive,
		getEnv,
	};
};

export const chargeUnits = (
	state: State,
	delta: number,
	onChargeBarUpdate: (unitId: string) => void
): Unit[] => {
	let performingUnits: Unit[] = [];

	for (const unit of state.battleData.units) {
		const cooldownMultiplier = unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
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
			unit.refresh = MIN_COOLDOWN;
			performingUnits.push(unit);
		}
		onChargeBarUpdate(unit.id);
	}
	return performingUnits;
};
