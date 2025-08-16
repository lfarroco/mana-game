import { Unit } from "../Models/Entities/Unit";
import { getUnitById, State } from "../Models/State";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
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
	sourceId: string,
} | {
	id: "heal",
	amount: number,
	sourceId: string,
} | {
	id: "shield",
	amount: number,
	sourceId: string,
} | {
	id: "poison",
	perTick: number,
	ticks: number,
	sourceId: string,
} | {
	id: "regen",
	perTick: number,
	ticks: number,
	sourceId: string,
} | {
	id: "haste",
	duration: number,
	sourceId: string,
	targets: Targeting,
} | {
	id: "slow",
	duration: number,
	sourceId: string,
	targets: Targeting,
} | {
	id: "charge",
	amount: number,
	sourceId: string,
	targets: Targeting,
} | {
	id: "increase_power",
	amount: number,
	sourceId: string,
	targets: Targeting,
} | {
	id: "multiply_power",
	multiplier: number,
	sourceId: string,
	targets: Targeting,
} | {
	id: "grant_gold",
	amount: number,
	sourceId: string,
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

export type EffectSourcePosition = "all"
	| "allies"
	| "enemies"
	| "row_allies"
	| "column_allies"
	| "top_ally"
	| "bottom_ally"
	| "left_ally"
	| "right_ally"
	;


export const processEffects = (scene: BattlegroundScene, effects: Effect[]) => {
	effects.forEach(processEffect(scene));
}

const processEffect = (scene: BattlegroundScene) => (effect: Effect) => {

	const sourceUnit = getUnitById(scene.state.battleData.units)(effect.sourceId)!

	switch (effect.id) {
		case "damage":
			effects.dealDamageLogicIO({ scene, sourceUnit });
			break;
		case "heal":
			effects.restoreMoraleLogicIO({ sourceUnit });
			break;
		case "shield":
			effects.addShieldLogicIO({ scene, sourceUnit });
			break;
		case "poison":
			// TODO: simplify: 10 dmg for 3 sec
			effects.applyPoisonLogicIO({
				scene,
				sourceUnit,
				amount: sourceUnit.power
			})
			break;
		case "regen":
			effects.applyRegenLogicIO({
				scene,
				sourceUnit,
				amount: sourceUnit.power
			});
			break;
		case "haste":
			const hasteTargets = resolveTargets(scene.state, effect);
			effects.applyHasteLogicIO({
				targets: hasteTargets,
				scene,
				sourceUnit,
				duration: effect.duration,
			});
			break;
		case "slow":
			const slowTargets = resolveTargets(scene.state, effect);
			effects.applySlowLogicIO({
				targets: slowTargets,
				scene,
				sourceUnit,
				duration: effect.duration,
			});
			break;
		case "charge":
			const chargeTargets = resolveTargets(scene.state, effect);
			effects.applyChargeLogicIO({
				targets: chargeTargets,
				scene,
				sourceUnit,
				amount: effect.amount,
			});
			break;
		case "increase_power":
			effects.increasePower({
				targets: resolveTargets(scene.state, effect),
				scene,
				sourceUnit,
				amount: effect.amount,
			});
			break;
		case "multiply_power":
			effects.multiplyPower({
				targets: resolveTargets(scene.state, effect),
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

	processReactions(scene, effect);
}

function processReactions(
	scene: BattlegroundScene,
	effect: Effect,
) {

	// effects that can't be reacted to
	if (["charge", "increase_power", "multiply_power"].includes(effect.id)) {
		return;
	}

	const sourceUnit = getUnitById(scene.state.battleData.units)(effect.sourceId)!;

	const effectListeners = scene.state.battleData.units
		.filter(u => u.id != effect.sourceId) //not self!
		.filter(u => {
			return u.reactions.some(r => r.effectId === effect.id);
		});

	const reactions = effectListeners.flatMap(u => {
		return u.reactions.filter(r => {
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

	});

	reactions.forEach(r => {
		processEffects(scene, r.effects);
	});

}

function resolveTargets(state: State, effect: Effect): Unit[] {
	// Only some effects have targets
	if (!('targets' in effect)) {
		console.warn(`Invalid trigger data. Effect ${effect.id} should have targets`);
		return [];
	}

	const sourceUnit = getUnitById(state.battleData.units)(effect.sourceId)!;
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