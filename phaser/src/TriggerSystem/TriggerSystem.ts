import { Unit } from "@Models/Entities/Unit";
import * as effects from "./effects";
import { pickRandom } from "../utils";
import { State } from "@Models/State";

import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export type EffectId =
	| "damage"
	| "heal"
	| "shield"
	| "poison"
	| "regen"
	| "haste"
	| "slow"
	| "slow"
	| "charge"
	| "increase_power"
	| "decrease_power"
	| "multiply_power"
	| "increase_critical"
	| "distribute_power"
	| "absorb_power"
	| "sacrifice_effect"
	| "re_hasted"
	| "re_slow"
	| "on_crit"
	| "every_100_damage"
	| "every_100_shield"
	| "every_100_heal"
	| "every_10_poison"
	| "every_10_regen"
	| "on_over_heal"
	| "on_battle_start";

export type EffectReaction = {
	position: EffectSourcePosition;
	effectId: EffectId | "all";
	effects: Effect[];
};

export type Effect =
	| {
		id: "damage";
	}
	| {
		id: "heal";
	}
	| {
		id: "shield";
	}
	| {
		id: "poison";
	}
	| {
		id: "regen";
	}
	| {
		id: "haste";
		duration: number;
		targets: Targeting;
	}
	| {
		id: "slow";
		duration: number;
		targets: Targeting;
	}
	| {
		id: "charge";
		duration: number;
		targets: Targeting;
	}
	| {
		id: "increase_power";
		amount: number;
		permanent?: boolean;
		targets: Targeting;
	}
	| {
		id: "decrease_power";
		amount: number;
		permanent?: boolean;
		targets: Targeting;
	}
	| {
		id: "multiply_power";
		multiplier: number;
		baseMultiplier: number;
		targets: Targeting;
	}
	| {
		id: "increase_critical";
		amount: number;
		permanent?: boolean;
		targets: Targeting;
	}
	| {
		id: "distribute_power";
		targets: Targeting;
		permanent?: boolean;
	}
	| {
		id: "absorb_power";
		targets: Targeting;
		permanent?: boolean;
	}
	| {
		id: "sacrifice_effect";
		targets: Targeting;
	}
	| {
		id: "re_hasted";
	}
	| {
		id: "re_slow";
	}
	| {
		id: "on_crit";
	}
	| {
		id: "every_100_damage";
	}
	| {
		id: "every_100_shield";
	}
	| {
		id: "every_100_heal";
	}
	| {
		id: "every_10_poison";
	}
	| {
		id: "every_10_regen";
	}
	| {
		id: "on_over_heal";
	}
	| {
		id: "on_battle_start";
	};

export type Targeting =
	| {
		id: "self";
	}
	| {
		id: "random_ally";
		count: number;
	}
	| {
		id: "random_enemy";
		count: number;
	}
	| {
		id: "row_allies";
	}
	| {
		id: "column_allies";
	}
	| {
		id: "all_allies";
		ofType: "any" | "damage" | "heal" | "shield" | "poison" | "regen";
	}
	| {
		id: "all_enemies";
	}
	| {
		id: "strongest_enemy";
	}
	| {
		id: "weakest_enemy";
	}
	| {
		id: "strongest_ally";
	}
	| {
		id: "weakest_ally";
	}
	| {
		id: "top_ally";
	}
	| {
		id: "bottom_ally";
	}
	| {
		id: "left_ally";
	}
	| {
		id: "right_ally";
	}
	| {
		id: "trigger";
	};

export type EffectSourcePosition =
	| "all"
	| "allies"
	| "enemies"
	| "row_allies"
	| "column_allies"
	| "top_ally"
	| "bottom_ally"
	| "left_ally"
	| "right_ally"
	| "self";

export const EFFECT_SOURCE_POSITIONS: { [key in EffectSourcePosition]: EffectSourcePosition } = {
	all: "all",
	allies: "allies",
	enemies: "enemies",
	row_allies: "row_allies",
	column_allies: "column_allies",
	top_ally: "top_ally",
	bottom_ally: "bottom_ally",
	left_ally: "left_ally",
	right_ally: "right_ally",
	self: "self",
};

// Process a list of effects that originate from a given source unit
export const processEffectsIO = (env: CombatEnvironment, sourceUnit: Unit, effectsList: Effect[], isReaction: boolean, triggeringUnit?: Unit, scale: number = 1, delayedExecution?: number) => {
	effectsList.forEach((effect) => {
		processEffectIO(env, sourceUnit, effect, isReaction, triggeringUnit, scale, delayedExecution);
	});
};

const processEffectIO = (env: CombatEnvironment, sourceUnit: Unit, effect: Effect, isReaction: boolean, triggeringUnit?: Unit, scale: number = 1, delayedExecution?: number) => {
	switch (effect.id) {
		case "damage":
			effects.dealDamageLogicIO(env, sourceUnit, scale, delayedExecution);
			break;
		case "heal":
			effects.restoreLife(env, sourceUnit, scale, delayedExecution);
			break;
		case "shield":
			effects.addShieldLogicIO(env, sourceUnit, scale, delayedExecution);
			break;
		case "poison":
			effects.applyPoisonLogicIO(env, sourceUnit, scale, delayedExecution);
			break;
		case "regen":
			effects.applyRegenLogicIO(env, sourceUnit, scale, delayedExecution);
			break;
		case "haste":
			const hasteTargets = resolveTargets(env.state, sourceUnit, effect, triggeringUnit);
			effects.applyHasteLogicIO(env, hasteTargets, sourceUnit, effect.duration * scale, (_target: Unit) =>
				processReactions(env, sourceUnit, { id: "re_hasted" }, scale),
				delayedExecution
			);
			break;
		case "slow":
			const slowTargets = resolveTargets(env.state, sourceUnit, effect, triggeringUnit);
			effects.applySlowLogicIO(env, sourceUnit, slowTargets, effect.duration * scale, (_target: Unit) =>
				processReactions(env, sourceUnit, { id: "re_slow" }, scale),
				delayedExecution
			);
			break;
		case "charge":
			const chargeTargets = resolveTargets(env.state, sourceUnit, effect, triggeringUnit);
			effects.applyChargeLogicIO(env, sourceUnit, chargeTargets, effect.duration * scale, delayedExecution);
			break;
		case "increase_power":
			const increasePowerTargets = resolveTargets(env.state, sourceUnit, effect, triggeringUnit);
			effects.increasePower(
				env,
				increasePowerTargets,
				effect.amount * scale,
				effect.permanent || false,
				sourceUnit,
				delayedExecution
			);
			break;
		case "decrease_power":
			const decreasePowerTargets = resolveTargets(env.state, sourceUnit, effect, triggeringUnit);
			effects.decreasePower(
				env,
				decreasePowerTargets,
				effect.amount * scale,
				effect.permanent || false,
				sourceUnit,
				delayedExecution
			);
			break;
		case "increase_critical":
			const increaseCriticalTargets = resolveTargets(env.state, sourceUnit, effect, triggeringUnit);
			effects.increaseCritical(env, increaseCriticalTargets, effect.amount * scale, sourceUnit, effect.permanent || false, delayedExecution);
			break;
		case "multiply_power":
			effects.multiplyPower({
				env,
				targets: resolveTargets(env.state, sourceUnit, effect, triggeringUnit),
				sourceUnit,
				multiplier: Math.pow(effect.multiplier, scale),
				delayedExecution
			});
			break;
		case "distribute_power":
			effects.distributePower(env, sourceUnit, resolveTargets(env.state, sourceUnit, effect, triggeringUnit), effect.permanent || false, delayedExecution);
			break;
		case "absorb_power":
			effects.absorbPower(env, sourceUnit, resolveTargets(env.state, sourceUnit, effect, triggeringUnit), effect.permanent || false, delayedExecution);
			break;
		case "sacrifice_effect":
			effects.sacrificeEffect(env, sourceUnit, delayedExecution);
			break;
		case "re_hasted":
			break;
		case "re_slow":
			break;
		case "on_crit":
		case "every_100_damage":
		case "every_100_shield":
		case "every_100_heal":
		case "every_10_poison":
		case "every_10_regen":
		case "on_over_heal":
		case "on_battle_start":
			break;
		default:
			const _exhaustiveCheck: never = effect;
			return _exhaustiveCheck;
	}

	if (!isReaction)
		processReactions(env, sourceUnit, effect, scale);
};

const sameForce = (unit: Unit, triggeringUnit: Unit) => unit.force === triggeringUnit.force;

const GLOBAL_REACTIONS = ["on_crit", "every_100_damage", "every_100_shield", "every_100_heal", "every_10_poison", "every_10_regen", "on_over_heal", "on_battle_start"]
const BASIC_ABILITIES = ["damage", "shield", "poison", "regen", "heal"]

export function processReactions(env: CombatEnvironment, triggeringUnit: Unit, effect: Effect, scale: number = 1) {
	if (["charge", "increase_power", "decrease_power", "multiply_power"].includes(effect.id)) {
		return;
	}
	const candidates = env.state.battleData.units
		.filter((u) => u.id != triggeringUnit.id || GLOBAL_REACTIONS.includes(effect.id))

	candidates
		.forEach((u) => {
			const reactions = u.reactions
				.filter(r =>
					r.effectId === effect.id || (r.effectId === "all" && BASIC_ABILITIES.includes(effect.id))
				)
				.filter((r) => {
					switch (r.position) {
						case "all":
							return true;
						case "allies":
							return sameForce(u, triggeringUnit);
						case "enemies":
							return !sameForce(u, triggeringUnit);
						case "row_allies":
							return sameForce(u, triggeringUnit) && u.position.y === triggeringUnit.position.y;
						case "column_allies":
							return sameForce(u, triggeringUnit) && u.position.x === triggeringUnit.position.x;
						case "top_ally":
							return sameForce(u, triggeringUnit) && triggeringUnit.position.y === u.position.y - 1 && triggeringUnit.position.x === u.position.x;
						case "bottom_ally":
							return sameForce(u, triggeringUnit) && triggeringUnit.position.y === u.position.y + 1 && triggeringUnit.position.x === u.position.x;
						case "left_ally":
							return (
								sameForce(u, triggeringUnit) && triggeringUnit.position.x === u.position.x - 1 && triggeringUnit.position.y === u.position.y
							);
						case "right_ally":
							return (
								sameForce(u, triggeringUnit) && triggeringUnit.position.x === u.position.x + 1 && triggeringUnit.position.y === u.position.y
							);
						case "self":
							return u.id === triggeringUnit.id;
						default:
							const _exhaustiveCheck: never = r.position;
							return _exhaustiveCheck;
					}
				});

			reactions.forEach((r) => {
				// check if still in combat
				if (env.state.battleData.units.length === 0) {
					return;
				}

				if (env.effects.onReactionVisual) {
					env.effects.onReactionVisual(u.id);
				}
				processEffectsIO(env, u, r.effects, true, triggeringUnit, scale, 200);
			});
		});
}

export function resolveTargets(state: State, sourceUnit: Unit, effect: Effect, triggeringUnit?: Unit): Unit[] {
	if (!("targets" in effect)) {
		console.warn(`Invalid trigger data. Effect ${effect.id} should have targets`);
		return [];
	}
	const isInBattle = state.battleData.units.length > 0;

	const allUnits = isInBattle ? state.battleData.units : state.session.team.units;
	const allies = allUnits.filter((u) => u.force === sourceUnit.force);
	const enemies = allUnits.filter((u) => u.force !== sourceUnit.force);

	switch (effect.targets.id) {
		case "self":
			return [sourceUnit];

		case "random_ally":
			const otherAllies = allies.filter((u) => u.id !== sourceUnit.id);
			return pickRandom(otherAllies, effect.targets.count);

		case "random_enemy":
			return pickRandom(enemies, effect.targets.count);

		case "row_allies":
			return allies
				.filter((u) => u.id !== sourceUnit.id)
				.filter((u) => u.position.y === sourceUnit.position.y);

		case "column_allies":
			return allies
				.filter((u) => u.id !== sourceUnit.id)
				.filter((u) => u.position.x === sourceUnit.position.x);

		case "all_allies":
			const validType = effect.targets.ofType;
			if (validType === "any") return allies.filter((u) => u.id !== sourceUnit.id);
			else return allies.filter((u) => u.effects.some((e) => e.id === validType));

		case "all_enemies":
			return enemies;

		case "strongest_enemy":
			const strongestEnemies = enemies.sort((a, b) => b.power - a.power);
			return strongestEnemies.length > 0 ? [strongestEnemies[0]] : [];

		case "weakest_enemy":
			const weakestEnemies = enemies.sort((a, b) => a.power - b.power);
			return weakestEnemies.length > 0 ? [weakestEnemies[0]] : [];

		case "strongest_ally":
			const strongestAllies = allies.filter((u) => u.id !== sourceUnit.id).sort((a, b) => b.power - a.power);
			return strongestAllies.length > 0 ? [strongestAllies[0]] : [];

		case "weakest_ally":
			const weakestAllies = allies.filter((u) => u.id !== sourceUnit.id).sort((a, b) => a.power - b.power);
			return weakestAllies.length > 0 ? [weakestAllies[0]] : [];

		case "top_ally":
			return allies.filter(
				(u) => u.position.y === sourceUnit.position.y - 1 && u.position.x === sourceUnit.position.x
			);

		case "bottom_ally":
			return allies.filter(
				(u) => u.position.y === sourceUnit.position.y + 1 && u.position.x === sourceUnit.position.x
			);

		case "left_ally":
			return allies.filter(
				(u) => u.position.x === sourceUnit.position.x - 1 && u.position.y === sourceUnit.position.y
			);

		case "right_ally":
			return allies.filter(
				(u) => u.position.x === sourceUnit.position.x + 1 && u.position.y === sourceUnit.position.y
			);

		case "trigger":
			return triggeringUnit ? [triggeringUnit] : [sourceUnit];

		default:
			const formattedEvent = JSON.stringify(effect, null, 2);
			throw new Error(`Unknown target type. Effect: ${formattedEvent}`);
	}
}
