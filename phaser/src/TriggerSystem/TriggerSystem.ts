import { Unit } from "../Models/Entities/Unit";
import { State } from "../Models/State";
import BattlegroundScene, { scene } from "../Scenes/Battleground/BattlegroundScene";
import * as effects from "./effects";
import { pickRandom } from "../utils";

export type EffectReaction = {
	position: EffectSourcePosition;
	effectId: string; // e.g. "damage", "heal", "shield", "poison", "regen", "haste", "slow", "charge"
	effects: Effect[]
}

export type Effect = {
	id: "damage",
	amount: number,
} | {
	id: "heal",
	amount: number,
} | {
	id: "shield",
	amount: number,
} | {
	id: "poison",
	perTick: number,
} | {
	id: "regen",
	perTick: number,
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
	amount: number,
	targets: Targeting,
} | {
	id: "increase_power",
	amount: number,
	targets: Targeting,
} | {
	id: "multiply_power",
	multiplier: number,
	targets: Targeting,
} | {
	id: "grant_gold",
	amount: number,
	forceId: string,
};

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
	id: "triggering_unit",
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
	effects.forEach(effect => processEffectIO(sourceUnit, effect));
}

const processEffectIO = (sourceUnit: Unit, effect: Effect) => {

	switch (effect.id) {
		case "damage":
			effects.dealDamageLogicIO(sourceUnit);
			break;
		case "heal":
			effects.restoreMoraleLogicIO({ sourceUnit });
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
			const hasteTargets = resolveTargets(scene.state, sourceUnit, effect);
			effects.applyHasteLogicIO({
				targets: hasteTargets,
				sourceUnit,
				duration: effect.duration,
			});
			break;
		case "slow":
			const slowTargets = resolveTargets(scene.state, sourceUnit, effect);
			effects.applySlowLogicIO({
				targets: slowTargets,
				scene,
				sourceUnit,
				duration: effect.duration,
			});
			break;
		case "charge":
			const chargeTargets = resolveTargets(scene.state, sourceUnit, effect);
			effects.applyChargeLogicIO({
				targets: chargeTargets,
				scene,
				sourceUnit,
				amount: effect.amount,
			});
			break;
		case "increase_power":
			effects.increasePower({
				targets: resolveTargets(scene.state, sourceUnit, effect),
				scene,
				sourceUnit,
				amount: effect.amount,
			});
			break;
		case "multiply_power":
			effects.multiplyPower({
				targets: resolveTargets(scene.state, sourceUnit, effect),
				scene,
				sourceUnit,
				multiplier: effect.multiplier,
			});
			break;
		case "grant_gold":
			// find target by forceId and apply gold
			// not implemented yet
			effects.grantGoldLogic({
				forceId: effect.forceId,
				amount: effect.amount,
				scene,
				sourceUnit,
			});
			break;
		default:
			const _exhaustiveCheck: never = effect;
			return _exhaustiveCheck;
	}

	processReactions(scene, sourceUnit, effect);
}

function processReactions(
	scene: BattlegroundScene,
	sourceUnit: Unit,
	effect: Effect,
) {

	// effects that can't be reacted to
	if (["charge", "increase_power", "multiply_power"].includes(effect.id)) {
		return;
	}

	const effectListeners = scene.state.battleData.units
		.filter(u => u.id != sourceUnit.id) //not self!
		.filter(u => {
			return u.reactions.some(r => r.effectId === effect.id);
		});

	// Evaluate reactions per listener and process them with that listener as the source
	effectListeners.forEach(u => {
		const eligible = u.reactions.filter(r => {
			switch (r.position) {
				case "all":
					return true;
				case "allies":
					return u.force === sourceUnit.force;
				case "enemies":
					return u.force !== sourceUnit.force;
				case "row_allies":
					return u.force === sourceUnit.force && u.position.x === u.position.x;
				case "column_allies":
					return u.force === sourceUnit.force && u.position.y === u.position.y;
				case "top_ally":
					return u.force === sourceUnit.force && sourceUnit?.position.y - 1 === u.position.y;
				case "bottom_ally":
					return u.force === sourceUnit.force && sourceUnit?.position.y + 1 === u.position.y;
				case "left_ally":
					return u.force === sourceUnit.force && sourceUnit?.position.x - 1 === u.position.x;
				case "right_ally":
					return u.force === sourceUnit.force && sourceUnit?.position.x + 1 === u.position.x;
				default:
					const _exhaustiveCheck: never = r.position;
					return _exhaustiveCheck;
			}
		});

		eligible.forEach(r => {
			processEffectsIO(u, r.effects);
		});
	});

}

function resolveTargets(state: State, sourceUnit: Unit, effect: Effect): Unit[] {
	// Only some effects have targets
	if (!('targets' in effect)) {
		console.warn(`Invalid trigger data. Effect ${effect.id} should have targets`);
		return [];
	}

	const allUnits = state.battleData.units;
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
			return allies.filter(u => u.id !== sourceUnit.id);

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

		case "triggering_unit":
			return [sourceUnit];

		default:
			const formattedEvent = JSON.stringify(effect, null, 2);
			throw new Error(`Unknown target type. Effect: ${formattedEvent}`);
	}
}