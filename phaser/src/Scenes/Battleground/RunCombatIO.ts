import { getCurrentScene, getState, State } from "@Models/State";
import { MIN_COOLDOWN } from "@Constants/constants";
import { Unit } from "@Models/Entities/Unit";
import { processEffectsIO } from "../../TriggerSystem/TriggerSystem";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import * as Systems from "./Systems";
import * as StatusEffectSystem from "./Systems/StatusEffectSystem";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import { getBattleCore } from "@Models/Entities/Card";
import { delay } from "@Utils/animation";
import { getCharaById } from "@Systems/Chara/Chara";
import { deactivateBlackHole } from "./BlackHole";

export type WaveOutcome = "player_won" | "player_lost";

let active: boolean = false;


export const runCombatIO = () => {
	if (active) {
		throw new Error("Combat is already active");
	}
	Systems.Timeout.initializeTimeoutDamageSystem();
	Systems.Poison.initialize();
	Systems.Regen.initialize();
	StatusEffectSystem.initialize();

	const state = getState();
	Systems.CombatStatsTracker.initialize(state);

	active = true;
	Systems.CountdownTimer.start();

	const allUnits = getState().battleData.units;
	allUnits.forEach((unit) => {
		const battleStartReactions = unit.reactions.filter(
			(r) => r.effectId === "on_battle_start"
		);
		battleStartReactions.forEach((r) => {
			processEffectsIO(unit, r.effects, true);
		});
	});
};

export function updateFrame(_time: number, delta: number): void {
	if (!active) return;

	const state = getState();

	const scaledDelta = delta * getCurrentScene().time.timeScale;

	const unitsReadyToAct = chargeUnits(state, scaledDelta);

	for (const unit of unitsReadyToAct) {
		Animations.pop(unit.id);

		Systems.CombatStatsTracker.trackAction({ unit });
		processEffectsIO(unit, unit.effects, false);
	}

	Systems.Timeout.updateTimeoutDamageSystem(state, playerForce, cpuForce, scaledDelta);

	const playerLifeZero = getBattleCore(state)(playerForce.id).life <= 0;
	const cpuLifeZero = getBattleCore(state)(cpuForce.id).life <= 0;

	const outcome: WaveOutcome | null = cpuLifeZero
		? "player_won"
		: playerLifeZero
			? "player_lost"
			: null;

	if (outcome) {
		finishCombat(outcome);
	}
}

export async function finishCombat(outcome: WaveOutcome) {
	if (!active) return;

	active = false;

	Systems.Regen.stop();
	Systems.Poison.stop();
	StatusEffectSystem.stop();
	Systems.Timeout.stopTimeoutDamageSystem();
	Systems.CountdownTimer.stop();
	deactivateBlackHole();
	Systems.Timeout.onTimeoutDamageCombatEnd();

	const state = getState();
	Systems.CombatStatsTracker.stop(state);
	console.log("[RunCombatSystem] Combat ended. Outcome:", outcome);

	if (outcome === "player_lost") {
		await Animations.shatter(getCharaById(getBattleCore(getState())(playerForce.id).id));
	} else {
		await Animations.shatter(getCharaById(getBattleCore(getState())(cpuForce.id).id));
	}

	await delay(300);

	Systems.ResultsPhase.handleCombatEnded(state, outcome);
}

export function isActive(): boolean {
	return active;
}

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
