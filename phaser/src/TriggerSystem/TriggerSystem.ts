import { Unit } from "../Models/Entities/Unit";
import { getUnitById, State } from "../Models/State";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import * as implementations from "../TraitSystem/TraitEffects/implementations/index";
import { pickRandom } from "../utils";

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
	targeting: Targeting,
} | {
	id: "slow",
	duration: number,
	sourceId: string,
	targeting: Targeting,
} | {
	id: "charge",
	amount: number,
	sourceId: string,
	targeting: Targeting,
} | {
	id: "increase_power",
	amount: number,
	sourceId: string,
	targeting: Targeting,
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


export const processEffects = (scene: BattlegroundScene, effects: Effect[]) => {
	effects.forEach(processEffect(scene));
}

const processEffect = (scene: BattlegroundScene) => (effect: Effect) => {

	const sourceUnit = getUnitById(scene.state.battleData.units)(effect.sourceId)!

	switch (effect.id) {
		case "damage":
			implementations.dealDamageLogicIO({ scene, sourceUnit });
			break;
		case "heal":
			implementations.restoreMoraleLogicIO({
				scene, sourceUnit
			});
			break;
		case "shield":
			implementations.addShieldLogicIO({ scene, sourceUnit });
			break;
		case "poison":
			// TODO: simplify: 10 dmg for 3 sec
			implementations.applyPoisonLogicIO({
				targets: resolveTargets(scene.state, effect),
				scene,
				sourceUnit,
				amount: sourceUnit.power
			})
			break;
		case "regen":
			// not implemented yet (inverse of poison)
			break;
		case "haste":
			const hasteTargets = resolveTargets(scene.state, effect);
			implementations.applyHasteLogicIO({
				targets: hasteTargets,
				scene,
				sourceUnit,
				duration: effect.duration,
			});
			break;
		case "slow":
			const slowTargets = resolveTargets(scene.state, effect);
			implementations.applySlowLogicIO({
				targets: slowTargets,
				scene,
				sourceUnit,
				duration: effect.duration,
			});
			break;
		case "charge":
			const chargeTargets = resolveTargets(scene.state, effect);
			implementations.applyChargeLogicIO({
				targets: chargeTargets,
				scene,
				sourceUnit,
				amount: effect.amount,
			});
			break;
		case "increase_power":
			implementations.increasePower({
				targets: resolveTargets(scene.state, effect),
				scene,
				sourceUnit,
				amount: effect.amount,
			});
			break;
		case "grant_gold":
			// find target by forceId and apply gold
			// not implemented yet
			implementations.grantGoldLogic({
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
	if (["charge", "increase_power"].includes(effect.id)) {
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
	// Only some effects have targeting
	if (!('targeting' in effect)) {
		console.warn(`Invalid trigger data. Effect ${effect.id} should have no targeting defined`);
		return [];
	}

	const sourceUnit = getUnitById(state.battleData.units)(effect.sourceId)!;
	const allUnits = state.battleData.units;
	const allies = allUnits.filter(u => u.force === sourceUnit.force);
	const enemies = allUnits.filter(u => u.force !== sourceUnit.force);

	switch (effect.targeting.id) {
		case "self":
			return [sourceUnit];

		case "random_ally":
			const otherAllies = allies.filter(u => u.id !== sourceUnit.id);
			return pickRandom(otherAllies, effect.targeting.count);

		case "random_enemy":
			return pickRandom(enemies, effect.targeting.count);

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
			const _exhaustiveCheck: never = effect.targeting;
			return _exhaustiveCheck;
	}
}