import { State } from "@Models/State";
import { MIN_COOLDOWN } from "./ServerConstants";
import { Unit } from "@Models/Entities/Unit";
import { processEffectsIO } from "../../TriggerSystem/TriggerSystem";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import * as Timeout from "./Systems/TimeoutDamageSystem";
import * as Poison from "./Systems/PoisonDamageSystem";
import * as Regen from "./Systems/RegenSystem";
import * as CombatStatsTracker from "./Systems/CombatStatsTracker";
import { TimeoutSystemState } from "./Systems/TimeoutDamageSystem";
import { PoisonSystemState } from "./Systems/PoisonDamageSystem";
import { RegenSystemState } from "./Systems/RegenSystem";
import { StatusEffectSystemState } from "./Systems/StatusEffectSystem";
import { CombatStatsTrackerState } from "./Systems/CombatStatsTracker";
import * as StatusEffectSystem from "./Systems/StatusEffectSystem";
import * as CombatSystemStates from "./Systems/CombatSystemStates";
import { getBattleCore } from "@Models/Entities/Card";
import * as CombatEffectsRegistry from "./CombatEffectsRegistry";

export type WaveOutcome = "player_won" | "player_lost";

export type CombatEffects = {
	onUnitPop: (unitId: string) => void;
	onChargeBarUpdate: (unitId: string) => void;
	onCombatEnd: (state: State, outcome: WaveOutcome) => Promise<void>;
	getTimeScale: () => number;
	getScene: () => any;
	updateLifeDisplay: (force: string, life: number, delta: number) => void;
	updateShieldDisplay: (force: string, shield: number, delta: number) => void;
	updateRegenDisplay: (force: string, regen: number, delta: number) => void;
	updatePoisonDisplay: (force: string, poison: number, delta: number) => void;
	initBlackHole?: () => any;
	initCountdownTimer?: (blackHoleState: any) => any;
	initForceStats?: () => any;
	onReactionVisual?: (unitId: string) => Promise<void>;
	onDamage?: (sourceId: string, targetId: string, onHit: () => void) => void;
	onHeal?: (sourceId: string, targetId: string, onHit: () => void) => void;
	onShield?: (sourceId: string, targetId: string, onHit: () => void) => void;
	onPoison?: (sourceId: string, targetId: string, onHit: () => void) => void;

	onRegen?: (sourceId: string, targetId: string, onHit: () => void) => void;
	onHaste?: (sourceId: string, targetId: string, duration: number, onHit: () => void) => void;
	onSlow?: (sourceId: string, targetId: string, duration: number, onHit: () => void) => void;
	onCharge?: (sourceId: string, targetId: string, amount: number, onHit: () => void) => void;
	onIncreasePower?: (sourceId: string | undefined, targetId: string, onHit: () => void) => void;
	onDecreasePower?: (sourceId: string | undefined, targetId: string, onHit: () => void) => void;
	onIncreaseCritical?: (sourceId: string | undefined, targetId: string, onHit: () => void) => void;
	onPowerUpdate?: (unitId: string) => void;
	onTimeoutDamageVisual?: (targetForceId: string, damage: number, onHit: () => void) => void;
};

export type CombatRunner = {
	updateFrame: (state: State, time: number, delta: number) => void;
	finishCombat: (state: State, outcome: WaveOutcome) => Promise<void>;
	isActive: () => boolean;
};

type CombatRunnerState = {
	active: boolean;
	timeoutSystemState: TimeoutSystemState;
	poisonSystemState: PoisonSystemState;
	regenSystemState: RegenSystemState;
	statusEffectSystemState: StatusEffectSystemState;
	combatStatsTrackerState: CombatStatsTrackerState;
	countdownTimerState: any;
	blackHoleState: any;
	forceStatsState: any;
};

export const runCombat = (state: State, effects: CombatEffects): CombatRunner => {
	CombatEffectsRegistry.setCombatEffects(effects);

	const blackHoleState = effects.initBlackHole ? effects.initBlackHole() : null;
	const countdownTimerState = effects.initCountdownTimer ? effects.initCountdownTimer(blackHoleState) : null;

	const forceStatsState = effects.initForceStats ? effects.initForceStats() : null;

	const runnerState: CombatRunnerState = {
		active: true,
		timeoutSystemState: Timeout.initializeTimeoutDamageSystem(),
		poisonSystemState: Poison.initializePoisonSystem(),
		regenSystemState: Regen.initializeRegenSystem(),
		statusEffectSystemState: StatusEffectSystem.initialize(state),
		combatStatsTrackerState: CombatStatsTracker.initialize(state),
		countdownTimerState,
		blackHoleState,
		forceStatsState,
	};

	CombatSystemStates.setCombatSystemStates({
		poisonSystemState: runnerState.poisonSystemState,
		regenSystemState: runnerState.regenSystemState,
		combatStatsTrackerState: runnerState.combatStatsTrackerState,
		forceStatsState: runnerState.forceStatsState,
	});

	const allUnits = state.battleData.units;
	allUnits.forEach((unit) => {
		const battleStartReactions = unit.reactions.filter(
			(r) => r.effectId === "on_battle_start"
		);
		battleStartReactions.forEach((r) => {
			processEffectsIO(state, unit, r.effects, true);
		});
	});

	const updateFrame = (state: State, _time: number, delta: number): void => {
		if (!runnerState.active) return;

		const scaledDelta = delta * effects.getTimeScale();

		const unitsReadyToAct = chargeUnits(state, scaledDelta, effects.onChargeBarUpdate);

		for (const unit of unitsReadyToAct) {
			effects.onUnitPop(unit.id);

			CombatStatsTracker.trackAction(runnerState.combatStatsTrackerState, { unit });
			processEffectsIO(state, unit, unit.effects, false);

			const combatStates = CombatSystemStates.getCombatSystemStates();
			runnerState.poisonSystemState = combatStates.poisonSystemState;
			runnerState.regenSystemState = combatStates.regenSystemState;
			runnerState.forceStatsState = combatStates.forceStatsState;
		}

		runnerState.statusEffectSystemState = StatusEffectSystem.update(
			runnerState.statusEffectSystemState,
			state,
			scaledDelta
		);

		runnerState.timeoutSystemState = Timeout.updateTimeoutDamageSystem(
			runnerState.timeoutSystemState,
			state,
			playerForce(state),
			cpuForce(state),
			scaledDelta
		);

		const playerLifeZero = getBattleCore(state)(playerForce(state).id).life <= 0;
		const cpuLifeZero = getBattleCore(state)(cpuForce(state).id).life <= 0;

		const outcome: WaveOutcome | null = cpuLifeZero
			? "player_won"
			: playerLifeZero
				? "player_lost"
				: null;

		if (outcome) {
			finishCombat(state, outcome);
		}
	};

	const finishCombat = async (state: State, outcome: WaveOutcome) => {
		if (!runnerState.active) return;

		runnerState.active = false;

		StatusEffectSystem.stop(runnerState.statusEffectSystemState);
		runnerState.timeoutSystemState = Timeout.stopTimeoutDamageSystem(runnerState.timeoutSystemState);
		runnerState.timeoutSystemState = Timeout.onTimeoutDamageCombatEnd(runnerState.timeoutSystemState);
		CombatSystemStates.clearCombatSystemStates();
		CombatEffectsRegistry.clearCombatEffects();

		CombatStatsTracker.stop(runnerState.combatStatsTrackerState, state);
		console.log("[RunCombatSystem] Combat ended. Outcome:", outcome);

		await effects.onCombatEnd(state, outcome);
	};

	const isActive = (): boolean => {
		return runnerState.active;
	};

	return {
		updateFrame,
		finishCombat,
		isActive,
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
