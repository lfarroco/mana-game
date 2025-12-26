import { getCurrentScene, getState, State } from "@Models/State";
import { MIN_COOLDOWN } from "@Constants/constants";
import { Unit } from "@Models/Entities/Unit";
import { processEffectsIO } from "../../TriggerSystem/TriggerSystem";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import * as Systems from "./Systems";
import { TimeoutSystemState } from "./Systems/TimeoutDamageSystem";
import { PoisonSystemState } from "./Systems/PoisonDamageSystem";
import { RegenSystemState } from "./Systems/RegenSystem";
import * as StatusEffectSystem from "./Systems/StatusEffectSystem";
import * as CombatSystemStates from "./Systems/CombatSystemStates";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import { getBattleCore } from "@Models/Entities/Card";
import { delay } from "@Utils/animation";
import { getCharaById } from "@Systems/Chara/Chara";
import { deactivateBlackHole } from "./BlackHole";

export type WaveOutcome = "player_won" | "player_lost";

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
};

export const runCombatIO = (): CombatRunner => {
	const state = getState();

	const runnerState: CombatRunnerState = {
		active: true,
		timeoutSystemState: Systems.Timeout.initializeTimeoutDamageSystem(),
		poisonSystemState: Systems.Poison.initializePoisonSystem(),
		regenSystemState: Systems.Regen.initializeRegenSystem(),
	};

	CombatSystemStates.setCombatSystemStates({
		poisonSystemState: runnerState.poisonSystemState,
		regenSystemState: runnerState.regenSystemState,
	});

	StatusEffectSystem.initialize(state);

	Systems.CombatStatsTracker.initialize(state);

	Systems.CountdownTimer.start();

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

		const scaledDelta = delta * getCurrentScene().time.timeScale;

		const unitsReadyToAct = chargeUnits(state, scaledDelta);

		for (const unit of unitsReadyToAct) {
			Animations.pop(unit.id);

			Systems.CombatStatsTracker.trackAction({ unit });
			processEffectsIO(state, unit, unit.effects, false);

			const combatStates = CombatSystemStates.getCombatSystemStates();
			runnerState.poisonSystemState = combatStates.poisonSystemState;
			runnerState.regenSystemState = combatStates.regenSystemState;
		}

		runnerState.timeoutSystemState = Systems.Timeout.updateTimeoutDamageSystem(
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

		StatusEffectSystem.stop();
		runnerState.timeoutSystemState = Systems.Timeout.stopTimeoutDamageSystem(runnerState.timeoutSystemState);
		Systems.CountdownTimer.stop();
		deactivateBlackHole();
		runnerState.timeoutSystemState = Systems.Timeout.onTimeoutDamageCombatEnd(runnerState.timeoutSystemState);
		CombatSystemStates.clearCombatSystemStates();

		Systems.CombatStatsTracker.stop(state);
		console.log("[RunCombatSystem] Combat ended. Outcome:", outcome);

		if (outcome === "player_lost") {
			await Animations.shatter(getCharaById(getBattleCore(state)(playerForce(state).id).id));
		} else {
			await Animations.shatter(getCharaById(getBattleCore(state)(cpuForce(state).id).id));
		}

		await delay(300);

		Systems.ResultsPhase.handleCombatEnded(state, outcome);
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

function chargeUnits(state: State, delta: number): Unit[] {
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
		ChargeBarDisplay.updateChargeBar(unit.id);
	}
	return performingUnits;
}

