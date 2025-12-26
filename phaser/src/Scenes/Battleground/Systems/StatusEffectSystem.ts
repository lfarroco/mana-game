import { State } from "@Models/State";
import { cpuForce, Force, manipulateCoreLife, playerForce, applyDamageToForce } from "@Models/Entities/Force";
import * as Poison from "./PoisonDamageSystem";
import * as Regen from "./RegenSystem";
import * as CombatSystemStates from "./CombatSystemStates";

const tickInterval: number = 1000;

export type StatusEffectSystemState = {
	elapsed: number;
};

export function initialize(_state: State): StatusEffectSystemState {
	return { elapsed: 0 };
}

const tick = (state: State) => () => {
	tickForce(state, playerForce(state));
	tickForce(state, cpuForce(state));
}

function tickForce(state: State, force: Force): void {
	const combatStates = CombatSystemStates.getCombatSystemStates();

	const poisonAmount = Poison.getTickAmount(combatStates.poisonSystemState, force.id);
	const regenAmount = Regen.getTickAmount(combatStates.regenSystemState, force.id);

	const netHealing = regenAmount - poisonAmount;

	if (netHealing > 0) {
		manipulateCoreLife(state, force, netHealing);
	} else if (netHealing < 0) {
		applyDamageToForce(state, force, Math.abs(netHealing), 0, "poison", false);
	}
}

export function update(
	statusEffectState: StatusEffectSystemState,
	state: State,
	delta: number
): StatusEffectSystemState {
	const newElapsed = statusEffectState.elapsed + delta;

	if (newElapsed >= tickInterval) {
		tick(state)();
		return {
			elapsed: newElapsed - tickInterval,
		};
	}

	return {
		elapsed: newElapsed,
	};
}

export function stop(_statusEffectState: StatusEffectSystemState): void {
	// No cleanup needed
}
