import { State } from "@Models/State";
import { cpuForce, Force, manipulateCoreLife, playerForce, applyDamageToForce } from "@Models/Entities/Force";
import * as Poison from "./PoisonDamageSystem";
import * as Regen from "./RegenSystem";
import { CombatEnvironment } from "../CombatEnvironment";

const tickInterval: number = 1000;

export type StatusEffectSystemState = {
	elapsed: number;
};

export function initialize(_state: State): StatusEffectSystemState {
	return { elapsed: 0 };
}

const tick = (env: CombatEnvironment) => () => {
	tickForce(env, playerForce(env.state));
	tickForce(env, cpuForce(env.state));
}

function tickForce(env: CombatEnvironment, force: Force): void {
	const { combatStates } = env;
	const poisonAmount = Poison.getTickAmount(combatStates.poisonSystemState, force.id);
	const regenAmount = Regen.getTickAmount(combatStates.regenSystemState, force.id);

	const netHealing = regenAmount - poisonAmount;

	if (netHealing > 0) {
		manipulateCoreLife(env.state, force, netHealing, false, env.effects, env.combatStates.forceStatsState);
	} else if (netHealing < 0) {
		applyDamageToForce(env.state, force, Math.abs(netHealing), 0, "poison", false, env.effects, env.combatStates.forceStatsState);
	}
}

export function update(
	env: CombatEnvironment,
	statusEffectState: StatusEffectSystemState,
	delta: number
): StatusEffectSystemState {
	const newElapsed = statusEffectState.elapsed + delta;

	if (newElapsed >= tickInterval) {
		tick(env)();
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
