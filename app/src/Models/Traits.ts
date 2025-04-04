// traits are a way to add special abilities or characteristics to units

import { popText } from "../Systems/Chara/Animations/popText";
import { runPromisesInOrder } from "../utils";
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
};

export const SHY: Trait = {
	id: "shy" as TraitId,
	name: "Shy",
	description: "+3 defense when aline in a row",
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
				await popText({ text: "+3 defense", targetId: unit.id, speed: 2 });
				unit.defense += 3;
			}
		},
	}
}

export const BRAVE: Trait = {
	id: "brave" as TraitId,
	name: "Brave",
	description: "+10 attack when in the front row",
	unitHandlers: {
		[HANDLER_ON_BATTLE_START]: async (unit) => {
			if (unit.position.x !== FRONTLINE) return;

			unit.statuses["brave"] = Infinity;

			await popText({ text: "On Battle Start: Brave", targetId: unit.id });
			await popText({ text: "+10 attack", targetId: unit.id });

			unit.attack += 5;
		},
	},
	targetUnitHandlers: {
		[TARGET_HANDLER_ON_ATTACK_BY_ME]: async (unit, target) => {
			if (!unit.statuses["brave"]) return
			await popText({ text: "On Attack: Brave", targetId: unit.id });
			await popText({ text: "+1 attack", targetId: unit.id });
			unit.attack += 1;
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

export async function runUnitTraitHandlers(handler: UnitHandlerType) {
	const promises = state.battleData.units
		.flatMap(unit => {
			const reducingFn = (trait: Trait) => {
				if (!trait.unitHandlers || !trait.unitHandlers[handler])
					return []
				const handlerFn = trait.unitHandlers[handler];
				return [async () => await handlerFn!(unit)];
			}
			return unit.traits.map(getTrait).flatMap(reducingFn);
		});

	await runPromisesInOrder(promises);
}

export async function runTargetUnitTraitHandlers(handler: TargetUnitHandlerType, unit: Unit, target: Unit) {
	const promises = unit.traits.map(getTrait).flatMap(trait => {
		if (!trait.targetUnitHandlers) return [];
		const handlerFn = trait.targetUnitHandlers[handler];
		return [async () => await handlerFn!(unit, target)]
	});

	await runPromisesInOrder(promises);
}

// Future traits: check docs/traits/md

export const traits: { [id: TraitId]: Trait } = {
	[SHY.id]: SHY,
	[BRAVE.id]: BRAVE,
};
