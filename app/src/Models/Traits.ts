// traits are a way to add special abilities or characteristics to units

import { popText } from "../Systems/Chara/Animations/popText";
import { pickRandom, runPromisesInOrder } from "../utils";
import { snakeDistanceBetween } from "./Geometry";
import { State } from "./State";
import { Unit } from "./Unit";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let scene: Phaser.Scene;
let state: State;

export const init = (sceneRef: Phaser.Scene, stateRef: State) => {
	scene = sceneRef;
	state = stateRef;
}

export type TraitId = string & { __traitId: never };

const FRONTLINE = 6;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MIDDLELINE = 7;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BACKLINE = 8;

type UnitHandler = (u: Unit) => Promise<void>;
type TargetUnitHandler = (u: Unit, target: Unit) => Promise<void>;

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

export type UnitHandlerType = typeof HANDLER_ON_TURN_START
	| typeof HANDLER_ON_TURN_END
	| typeof HANDLER_ON_BATTLE_START
	| typeof HANDLER_ON_BATTLE_END;

export type TargetUnitHandlerType = typeof TARGET_HANDLER_ON_ATTACK_BY_ME
	| typeof TARGET_HANDLER_ON_DEFEND_BY_ME
	| typeof TARGET_HANDLER_ON_UNIT_KILL_BY_ME
	| typeof TARGET_HANDLER_ON_UNIT_KILL
	| typeof TARGET_HANDLER_ON_ALLIED_KILLED
	| typeof TARGET_HANDLER_ON_ENEMY_KILLED;

type UnitHandlerIndex = {
	[key in UnitHandlerType]?: UnitHandler;
};

type TargetUnitHandlerIndex = {
	[key in TargetUnitHandlerType]?: TargetUnitHandler;
};

export type Trait = {
	id: TraitId;
	name: string;
	description: string;
	unitHandlers?: UnitHandlerIndex,
	targetUnitHandlers?: TargetUnitHandlerIndex
	categories: string[];
};

export const SHY: Trait = {
	id: "shy" as TraitId,
	name: "Shy",
	description: "+30 HP when alone in a row",
	categories: ["defensive", "personality", "hp"],
	unitHandlers: {
		[HANDLER_ON_BATTLE_START]: async (unit) => {
			const neighboringUnits = state.battleData.units.filter((u) => {
				const distace = snakeDistanceBetween(
					u.position)(
						unit.position
					);
				return distace < 2 && u.id !== unit.id;
			});
			if (neighboringUnits.length === 0) {
				await popText({ text: "On Battle Start: Shy", targetId: unit.id, speed: 2 });
				await popText({ text: "+30 HP", targetId: unit.id, speed: 2 });
				unit.maxHp += 30;
				unit.hp = unit.maxHp;
			}
		},
	}
}

export const BRAVE: Trait = {
	id: "brave" as TraitId,
	name: "Brave",
	description: "+10 attack when in the front row",
	categories: ["attack", "personality", "offensive"],
	unitHandlers: {
		[HANDLER_ON_BATTLE_START]: async (unit) => {
			if (unit.position.x !== FRONTLINE) return;

			unit.statuses["brave"] = Infinity;

			await popText({ text: "On Battle Start: Brave", targetId: unit.id });
			await popText({ text: "+10 attack", targetId: unit.id });

			unit.attack += 5;
		},
	},

}

export const BATTLE_HUNGER: Trait = {
	id: "battle_hunger" as TraitId,
	name: "Battle Hunger",
	categories: ["attack", "personality", "offensive"],
	description: "Gains +1 attack every time this unit attacks",
	targetUnitHandlers: {
		[TARGET_HANDLER_ON_ATTACK_BY_ME]: async (unit, target) => {
			await popText({ text: "On attack: Battle Hunger", targetId: unit.id, speed: 2 });
			await popText({ text: "+1 attack", targetId: unit.id, speed: 2 });
			unit.attack += 1;
		}
	}
}

export const SHARP_EYES: Trait = {
	id: "sharp_eyes" as TraitId,
	name: "Sharp Eyes",
	description: "Increases critical hit chance by 10%",
	categories: ["attack", "offensive", "vision"],
	unitHandlers: {
		[HANDLER_ON_BATTLE_START]: async (unit) => {
			await popText({ text: "On Battle Start: Sharp Eyes", targetId: unit.id });
			await popText({ text: "+10% critical chance", targetId: unit.id });
			unit.crit += 10;
		}
	}
}

export const getTrait = (id: TraitId): Trait => {
	const trait = traits[id];
	if (!trait) {
		throw new Error(`Trait with id ${id} not found`);
	}
	return trait;
}

export async function runUnitTraitHandlers(units: Unit[], handler: UnitHandlerType) {
	const promises = units
		.flatMap(unit => {
			const reducingFn = (trait: Trait) => {
				if (!trait.unitHandlers || !trait.unitHandlers[handler])
					return []
				const handlerFn = trait.unitHandlers[handler];
				return [async () => handlerFn ? await handlerFn(unit) : Promise.resolve()]
			}
			return unit.traits.map(getTrait).flatMap(reducingFn);
		});

	await runPromisesInOrder(promises);
}

export async function runTargetUnitTraitHandlers(handler: TargetUnitHandlerType, unit: Unit, target: Unit) {
	const promises = unit.traits.map(getTrait).flatMap(trait => {
		if (!trait.targetUnitHandlers) return [];
		const handlerFn = trait.targetUnitHandlers[handler];
		return [async () => handlerFn ? await handlerFn(unit, target) : Promise.resolve()]
	});

	await runPromisesInOrder(promises);
}

// Future traits: check docs/traits/md

export const traits: { [id: TraitId]: Trait } = {
	[SHY.id]: SHY,
	[BRAVE.id]: BRAVE,
	[BATTLE_HUNGER.id]: BATTLE_HUNGER,
	[SHARP_EYES.id]: SHARP_EYES,
};

export const randomCategoryTrait = (category: string): Trait => {
	const traitsInCategory = Object.values(traits).filter(t => t.categories.includes(category));
	if (traitsInCategory.length === 0) {
		throw new Error(`No traits found for category ${category}`);
	}
	const [randomTrait] = pickRandom(traitsInCategory, 1)
	return randomTrait;
}