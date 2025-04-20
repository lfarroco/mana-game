// traits are a way to add special abilities or characteristics to units

import { popText } from "../Systems/Chara/Animations/popText";
import { updateUnitAttribute } from "../Systems/Chara/Chara";
import { pickRandom } from "../utils";
import { snakeDistanceBetween } from "./Geometry";
import { State } from "./State";
import { Unit, UNIT_EVENTS, UnitEvents } from "./Unit";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
//let scene: Phaser.Scene;
let state: State;

export const init = (_sceneRef: Phaser.Scene, stateRef: State) => {
	//scene = sceneRef;
	state = stateRef;
}

export type TraitId = string & { __traitId: never };
export type TraitCategory = string & { __traitCategory: never };

const FRONTLINE = 6;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
//const MIDDLELINE = 7;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
//const BACKLINE = 8;

// Handler type constants
export const HANDLER_ON_TURN_START = 'onTurnStart' as const;
export const HANDLER_ON_TURN_END = 'onTurnEnd' as const;
export const HANDLER_ON_BATTLE_START = 'onBattleStart' as const;
export const HANDLER_ON_BATTLE_END = 'onBattleEnd' as const;

// Target handler type constants
export const TARGET_HANDLER_ON_ATTACK_BY_ME = 'onAttackByMe' as const;
export const TARGET_HANDLER_ON_DEFEND_BY_ME = 'onDefendByMe' as const;
export const TARGET_HANDLER_ON_UNIT_KILL_BY_ME = 'onUnitKillByMe' as const;
export const TARGET_HANDLER_ON_UNIT_KILL = 'onUnitKill' as const;
export const TARGET_HANDLER_ON_ALLIED_KILLED = 'onAlliedKilled' as const;
export const TARGET_HANDLER_ON_ENEMY_KILLED = 'onEnemyKilled' as const;

export type Trait = {
	id: TraitId;
	name: string;
	description: string;
	categories: TraitCategory[];
	events: UnitEvents
};

export const TRAIT_CATEGORY_PERSONALITY = "personality" as TraitCategory;
export const TRAIT_CATEGORY_OFFENSIVE = "offensive" as TraitCategory;
export const TRAIT_CATEGORY_DEFENSIVE = "defensive" as TraitCategory;
export const TRAIT_CATEGORY_VISION = "vision" as TraitCategory;
export const TRAIT_CATEGORY_HP = "hp" as TraitCategory;
export const TRAIT_CATEGORY_ATTACK = "attack" as TraitCategory;

const makeTrait = (
	{
		id,
		name,
		description,
		categories,
		events = {}
	}: {
		id: TraitId;
		name: string;
		description: string;
		categories: TraitCategory[];
		events?: Partial<UnitEvents>;
	}): Trait => ({
		id,
		name,
		description,
		categories,
		events: {
			... (UNIT_EVENTS.reduce((acc, event) => {
				acc[event] = [];
				return acc;
			}, {} as UnitEvents)),
			...events
		},
	});

export const SHY: Trait = makeTrait({
	id: "shy" as TraitId,
	name: "Shy",
	description: "+30 HP when alone in a row",
	categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_HP],
	events: {
		onBattleStart: [(unit) => async () => {
			const neighboringUnits = state.battleData.units.filter((u) => {
				const distace = snakeDistanceBetween(
					u.position)(
						unit.position
					);
				return distace < 2 && u.id !== unit.id;
			});
			if (neighboringUnits.length === 0) {
				await popText({ text: "On Battle Start: Shy", targetId: unit.id, speed: 2 });
				updateUnitAttribute(unit, "maxHp", 30);
			}
		}]
	}
})

export const BRAVE: Trait = makeTrait({
	id: "brave" as TraitId,
	name: "Brave",
	description: "+10 attack when in the front row",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onBattleStart: [(unit) => async () => {
			if (unit.position.x !== FRONTLINE) return;

			await popText({ text: "On Battle Start: Brave", targetId: unit.id });

			await updateUnitAttribute(unit, "attack", 5);
		}]
	}
});

export const BATTLE_HUNGER: Trait = makeTrait({
	id: "battle_hunger" as TraitId,
	name: "Battle Hunger",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_OFFENSIVE],
	description: "+1 attack on each attack",
	events: {
		onAttackByMe: [(unit, _target) => async () => {
			await popText({ text: "On attack: Battle Hunger", targetId: unit.id, speed: 2 });
			await updateUnitAttribute(unit, "attack", 1);
		}]
	}
});

export const SHARP_EYES: Trait = makeTrait({
	id: "sharp_eyes" as TraitId,
	name: "Sharp Eyes",
	description: "Increases critical hit chance by 10%",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_OFFENSIVE, TRAIT_CATEGORY_VISION],
	events: {
		onBattleStart: [(unit) => async () => {
			await popText({ text: "On Battle Start: Sharp Eyes", targetId: unit.id });
			await popText({ text: "+10% critical chance", targetId: unit.id });
			unit.crit += 10;
		}]
	}
});

export const getTrait = (id: TraitId): Trait => {
	const trait = traits[id];
	if (!trait) {
		throw new Error(`Trait with id ${id} not found`);
	}
	return trait;
}

// Future traits: check docs/traits/md

export const traits: { [id: TraitId]: Trait } = {
	[SHY.id]: SHY,
	[BRAVE.id]: BRAVE,
	[BATTLE_HUNGER.id]: BATTLE_HUNGER,
	[SHARP_EYES.id]: SHARP_EYES,
};

export const randomCategoryTrait = (category: TraitCategory): Trait => {
	const traitsInCategory = Object.values(traits).filter(t => t.categories.includes(category));
	if (traitsInCategory.length === 0) {
		throw new Error(`No traits found for category ${category}`);
	}
	const [randomTrait] = pickRandom(traitsInCategory, 1)
	return randomTrait;
}

export function addUnitTrait(trait: Trait, unit: Unit) {

	UNIT_EVENTS.forEach(event => {
		// the type system doesn't capture that the events are the same
		//@ts-ignore
		unit.events[event].push(...trait.events[event]);
	});


	unit.traits.push(trait);
	popText({ text: `+ ${trait.name} Trait`, targetId: unit.id, type: "neutral" });
}
