import * as State from "@Models/State";
import * as Force from "@Models/Entities/Force";
import * as Poison from "@Systems/PoisonDamageSystem";
import * as Regen from "@Systems/RegenSystem";
import * as CombatTypes from "@Core/Combat/CombatTypes";
import * as Card from "@Models/Entities/Card";

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
	const { combatStates, logger } = env;
	const poisonAmount = Poison.getTickAmount(combatStates.poisonSystemState, force.id);
	const regenAmount = Regen.getTickAmount(combatStates.regenSystemState, force.id);

	const core = Card.getBattleCore(env.state)(force.id);
	if (!core || core.life <= 0) return;

	// Apply poison damage
	if (poisonAmount > 0) {
		Force.applyDamageToForce(
			env.state,
			force,
			poisonAmount,
			0,
			"poison",
			false,
		);
		logger.log({
			type: "poison_tick",
			force: force.id,
			amount: poisonAmount,
			newLife: core.life,
			newShield: core.shield,
		});
	}

	// Apply regen healing (only if core is still alive after poison)
	if (regenAmount > 0 && core.life > 0) {
		Force.manipulateCoreLife(
			env.state,
			force,
			regenAmount,
			false,
		);
		logger.log({
			type: "regen_tick",
			force: force.id,
			amount: regenAmount,
			newLife: core.life,
			newShield: core.shield,
		});
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
