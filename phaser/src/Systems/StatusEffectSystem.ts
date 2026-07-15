import * as State from "@Models/State";
import * as Force from "@Models/Entities/Force";
import * as Poison from "@Systems/PoisonDamageSystem";
import * as Regen from "@Systems/RegenSystem";
import * as CombatTypes from "@Core/Combat/CombatTypes";

const STATUS_EFFECT_TICK_INTERVAL_MS = 1000;

export type StatusEffectSystemState = {
	elapsed: number;
};

export function initialize(_state: State.State): StatusEffectSystemState {
	return { elapsed: 0 };
}

const tick = (env: CombatTypes.CombatEnvironment) => () => {
	tickForce(env, Force.playerForce(env.state));
	tickForce(env, Force.cpuForce(env.state));
};

function tickForce(env: CombatTypes.CombatEnvironment, force: Force.Force): void {
	const { combatStates } = env;
	const poisonAmount = Poison.getTickAmount(combatStates.poisonSystemState, force.id);
	const regenAmount = Regen.getTickAmount(combatStates.regenSystemState, force.id);

	const netHealing = regenAmount - poisonAmount;

	if (netHealing > 0) {
		Force.manipulateCoreLife(
			env.state,
			force,
			netHealing,
			false,
		);
	} else if (netHealing < 0) {
		Force.applyDamageToForce(
			env.state,
			force,
			Math.abs(netHealing),
			0,
			"poison",
			false,
		);
	}
}

export function update(
	env: CombatTypes.CombatEnvironment,
	statusEffectState: StatusEffectSystemState,
	delta: number
): StatusEffectSystemState {
	const newElapsed = statusEffectState.elapsed + delta;

	if (newElapsed >= STATUS_EFFECT_TICK_INTERVAL_MS) {
		tick(env)();
		return {
			elapsed: newElapsed - STATUS_EFFECT_TICK_INTERVAL_MS,
		};
	}

	return {
		elapsed: newElapsed,
	};
}

export function stop(_statusEffectState: StatusEffectSystemState): void {
	// No cleanup needed
}
