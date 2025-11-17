import { Unit } from "@Models/Entities/Unit";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import * as effects from "./effects";
import { pickRandom } from "../utils";

export type EffectReaction = {
	position: EffectSourcePosition;
	effectId: string; // e.g. "damage", "heal", "slow", "charge"
	effects: Effect[]
}

export type Effect = {
	id: "damage",
} | {
	id: "heal",
} | {
	id: "shield",
} | {
	id: "poison",
} | {
	id: "regen",
} | {
	id: "haste",
	duration: number,
	targets: Targeting,
} | {
	id: "slow",
	duration: number,
	targets: Targeting,
} | {
	id: "charge",
	duration: number,
	targets: Targeting,
} | {
	id: "increase_power",
	amount: number,
	permanent?: boolean,
	targets: Targeting,
} | {
	id: "multiply_power",
	multiplier: number,
	targets: Targeting,
} | {
	id: "increase_critical",
	amount: number,
	targets: Targeting,
}

type Targeting = {
	id: "self"
} | {
	id: "random_ally",
	count: number,
} | {
	id: "random_enemy",
	count: number,
} | {
	id: "row_allies",
} | {
	id: "column_allies",
} | {
	id: "all_allies",
	ofType: "any" | "damage" | "heal" | "shield" | "poison" | "regen"
} | {
	id: "all_enemies",
} | {
	id: "top_ally",
} | {
	id: "bottom_ally",
} | {
	id: "left_ally",
} | {
	id: "right_ally"
} | {
	id: "trigger",
}

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
	;

export const EFFECT_SOURCE_POSITIONS: { [key in EffectSourcePosition]: EffectSourcePosition } = {
	all: "all",
	allies: "allies",
	enemies: "enemies",
	row_allies: "row_allies",
	column_allies: "column_allies",
	top_ally: "top_ally",
	bottom_ally: "bottom_ally",
	left_ally: "left_ally",
	right_ally: "right_ally"
};

// Process a list of effects that originate from a given source unit
export const processEffectsIO = (
	sourceUnit: Unit,
	effects: Effect[],
) => {
	effects.forEach(effect => {
		processEffectIO(sourceUnit, effect);
	});
}

const processEffectIO = (sourceUnit: Unit, effect: Effect) => {

	switch (effect.id) {
		case "damage":
			effects.dealDamageLogicIO(sourceUnit);
			break;
		case "heal":
			effects.restoreLife(sourceUnit);
			break;
		case "shield":
			effects.addShieldLogicIO(sourceUnit);
			break;
		case "poison":
			effects.applyPoisonLogicIO(sourceUnit)
			break;
		case "regen":
			effects.applyRegenLogicIO(sourceUnit);
			break;
		case "haste":
			const hasteTargets = resolveTargets(sourceUnit, effect);
			effects.applyHasteLogicIO(hasteTargets, sourceUnit, effect.duration);
			break;
		case "slow":
			const slowTargets = resolveTargets(sourceUnit, effect);
			effects.applySlowLogicIO(sourceUnit, slowTargets, effect.duration);
			break;
		case "charge":
			const chargeTargets = resolveTargets(sourceUnit, effect);
			effects.applyChargeLogicIO(sourceUnit, chargeTargets, effect.duration);
			break;
		case "increase_power":
			const increasePowerTargets = resolveTargets(sourceUnit, effect);
			effects.increasePower(increasePowerTargets, effect.amount, effect.permanent || false, sourceUnit);
			break;
		case "increase_critical":
			const increaseCriticalTargets = resolveTargets(sourceUnit, effect);
			effects.increaseCritical(increaseCriticalTargets, effect.amount, sourceUnit);
			break;
		case "multiply_power":
			effects.multiplyPower({
				targets: resolveTargets(sourceUnit, effect),
				scene,
				sourceUnit,
				multiplier: effect.multiplier,
			});
			break;
		default:
			const _exhaustiveCheck: never = effect;
			return _exhaustiveCheck;
	}

	processReactions(sourceUnit, effect);
}

function processReactions(
	triggeringUnit: Unit,
	effect: Effect,
) {

	if (
		["charge", "increase_power", "increase_power", "multiply_power"]
			.includes(effect.id)
	) {
		return;
	}

	state.battleData.units
		.filter(u => u.force === triggeringUnit.force)
		.filter(u => u.id != triggeringUnit.id)
		.forEach(u => {

			const reactions = u.reactions.filter(r => {

				if (r.effectId !== effect.id && r.effectId !== "all") {
					return false;
				}

				switch (r.position) {
					case "all":
						return true;
					case "allies":
						return u.force === triggeringUnit.force;
					case "enemies":
						return u.force !== triggeringUnit.force;
					case "row_allies":
						return u.force === triggeringUnit.force && u.position.x === u.position.x;
					case "column_allies":
						return u.force === triggeringUnit.force && u.position.y === u.position.y;
					case "top_ally":
						return u.force === triggeringUnit.force && triggeringUnit?.position.y - 1 === u.position.y;
					case "bottom_ally":
						return u.force === triggeringUnit.force && triggeringUnit?.position.y + 1 === u.position.y;
					case "left_ally":
						return u.force === triggeringUnit.force && triggeringUnit?.position.x - 1 === u.position.x;
					case "right_ally":
						return u.force === triggeringUnit.force && triggeringUnit?.position.x + 1 === u.position.x;
					default:
						const _exhaustiveCheck: never = r.position;
						return _exhaustiveCheck;
				}
			});

			reactions.forEach(r => {
				processEffectsIO(u, r.effects);
			});
		});

}

function resolveTargets(sourceUnit: Unit, effect: Effect): Unit[] {
	if (!('targets' in effect)) {
		console.warn(`Invalid trigger data. Effect ${effect.id} should have targets`);
		return [];
	}

	const filterOutCore = ["increase_power", "multiply_power", "increase_critical"]
		.includes(effect.id);

	const allUnits = state.battleData.units.filter(u => !u.isCore || !filterOutCore);
	const allies = allUnits.filter(u => u.force === sourceUnit.force);
	const enemies = allUnits.filter(u => u.force !== sourceUnit.force);

	switch (effect.targets.id) {
		case "self":
			return [sourceUnit];

		case "random_ally":
			const otherAllies = allies.filter(u => u.id !== sourceUnit.id);
			return pickRandom(otherAllies, effect.targets.count);

		case "random_enemy":
			return pickRandom(enemies, effect.targets.count);

		case "row_allies":
			return allies.filter(u => u.id !== sourceUnit.id)
				.filter(u => u.position.y === sourceUnit.position.y);

		case "column_allies":
			return allies.filter(u => u.id !== sourceUnit.id)
				.filter(u => u.position.x === sourceUnit.position.x);

		case "all_allies":
			const validType = effect.targets.ofType
			if (validType === "any")
				return allies.filter(u => u.id !== sourceUnit.id);
			else
				return allies.filter(u => u.effects.some(e => e.id === validType))

		case "all_enemies":
			return enemies;

		case "top_ally":
			return allies.filter(u => u.position.y === sourceUnit.position.y - 1 && u.position.x === sourceUnit.position.x);

		case "bottom_ally":
			return allies.filter(u => u.position.y === sourceUnit.position.y + 1 && u.position.x === sourceUnit.position.x);

		case "left_ally":
			return allies.filter(u => u.position.x === sourceUnit.position.x - 1 && u.position.y === sourceUnit.position.y);

		case "right_ally":
			return allies.filter(u => u.position.x === sourceUnit.position.x + 1 && u.position.y === sourceUnit.position.y);

		case "trigger":
			return [sourceUnit];

		default:
			const formattedEvent = JSON.stringify(effect, null, 2);
			throw new Error(`Unknown target type. Effect: ${formattedEvent}`);
	}
}