import * as Force from "../Entities/Force";
import * as Poison from "./PoisonDamageSystem";
import * as Regen from "./RegenSystem";
import * as Card from "../Entities/Card";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../Constants";
import { CombatEnvironment, CombatState } from "../Models";

const STATUS_EFFECT_TICK_INTERVAL_MS = 1000;

export type StatusEffectSystemState = {
	elapsed: number;
};

export function initialize(_state: CombatState): StatusEffectSystemState {
	return { elapsed: 0 };
}

function tickForce(env: CombatEnvironment, forceId: string): void {
	const { combatStates, logger } = env;
	const poisonAmount = Poison.getPoisonRate(combatStates.poisonSystemState, forceId);
	const regenAmount = Regen.getRegenRate(combatStates.regenSystemState, forceId);

	const core = Card.getBattleCore(env.combatState)(forceId);
	if (!core || core.life <= 0) return;

	// Apply poison damage
	if (poisonAmount > 0) {
		const oldLife = core.life;
		Force.applyDamageToForce(
			env.combatState,
			forceId,
			poisonAmount,
			0,
			"poison",
			false,
		);
		logger.log({
			type: "poison_tick",
			force: forceId,
			amount: poisonAmount,
			newLife: core.life,
			lifeDelta: core.life - oldLife,
		});
	}

	// Apply regen healing (only if core is still alive after poison)
	if (regenAmount > 0 && core.life > 0) {
		const oldLife = core.life;
		Force.manipulateCoreLife(
			env.combatState,
			forceId,
			regenAmount,
			false,
		);
		logger.log({
			type: "regen_tick",
			force: forceId,
			amount: regenAmount,
			newLife: core.life,
			lifeDelta: core.life - oldLife,
		});
	}
}

export function update(
	env: CombatEnvironment,
	statusEffectState: StatusEffectSystemState,
	delta: number
): StatusEffectSystemState {
	const newElapsed = statusEffectState.elapsed + delta;

	if (newElapsed >= STATUS_EFFECT_TICK_INTERVAL_MS) {
		tickForce(env, FORCE_ID_PLAYER);
		tickForce(env, FORCE_ID_CPU);
		return {
			elapsed: newElapsed - STATUS_EFFECT_TICK_INTERVAL_MS,
		};
	}

	return {
		elapsed: newElapsed,
	};
}

