import { GameEvents } from "../constants/events";
import { applyDamageToForce } from "../Models/Entities/Force";
import { Unit } from "../Models/Entities/Unit";
import { getUnitById } from "../Models/State";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { createDealDamageLogic } from "../TraitSystem/TraitEffects/implementations/dealDamage";

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
	targetId: string,
} | {
	id: "charge",
	amount: number,
	sourceId: string,
	targetId: string,
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
	switch (effect.id) {
		case "damage":
			handleDealDamage(scene, effect);
			break;
		case "heal":
			// find target by id and apply heal
			break;
		case "shield":
			// find target by id and apply shield
			break;
		case "poison":
			// find target by id and apply poison
			break;
		case "regen":
			// find target by id and apply regen
			break;
		case "haste":
			// find target(s) by targeting and apply haste
			break;
		case "slow":
			// find target by id and apply slow
			break;
		case "charge":
			// find target by id and apply charge
			break;
		default:
			const _exhaustiveCheck: never = effect;
			return _exhaustiveCheck;
	}

	processReactions(scene, effect);
}

function handleDealDamage(scene: BattlegroundScene, effect: { amount: number, sourceId: string }) {

	const emitter = (unit: Unit, amount: number) => {
		scene.events.emit(
			GameEvents.UNIT_ATTACK,
			{ unit, amount }
		);
	}

	createDealDamageLogic(emitter, applyDamageToForce)({
		scene,
		sourceUnit: getUnitById(scene.state.battleData.units)(effect.sourceId)!
	})
}

function processReactions(
	scene: BattlegroundScene,
	effect: Effect,
) {

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
					return u.force === effect.sourceId;
				case "enemies":
					return u.force !== effect.sourceId;
				case "row_allies":
					return u.force === effect.sourceId && u.position.y === u.position.y;
				case "column_allies":
					return u.force === effect.sourceId && u.position.x === u.position.x;
				case "top_ally":
					return u.force === effect.sourceId && sourceUnit?.position.y - 1 === u.position.y;
				case "bottom_ally":
					return u.force === effect.sourceId && sourceUnit?.position.y + 1 === u.position.y;
				case "left_ally":
					return u.force === effect.sourceId && sourceUnit?.position.x - 1 === u.position.x;
				case "right_ally":
					return u.force === effect.sourceId && sourceUnit?.position.x + 1 === u.position.x;
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