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

type UnitHandlerIndex = {
	onAcquire?: UnitHandler;
	onRemove?: UnitHandler;
	onTurnStart?: UnitHandler;
	onTurnEnd?: UnitHandler;
	onBattleStart?: UnitHandler;
	onBattleEnd?: UnitHandler;
}

// the units provided in the event handlers are temporary (don't need cleanup)
export type Trait = {
	id: TraitId;
	name: string;
	description: string;
	unitHandlers?: UnitHandlerIndex,
	targetUnitHandlers?: {
		onAttackByMe?: TargetUnitHandler;
		onDefendByMe?: TargetUnitHandler;
		onUnitKillByMe?: TargetUnitHandler;
		onUnitKill?: TargetUnitHandler;
		onAlliedKilled?: TargetUnitHandler;
		onEnemyKilled?: TargetUnitHandler;
	}
};

export const SHY: Trait = {
	id: "shy" as TraitId,
	name: "Shy",
	description: "+3 defense when aline in a row",
	unitHandlers: {
		onBattleStart: async (unit) => {
			const neighboringUnits = state.battleData.units.filter((u) => {
				const distace = snakeDistanceBetween(
					u.position)(
						unit.position
					);
				return distace < 2 && u.id !== unit.id;
			});
			if (neighboringUnits.length === 0) {
				await popText(scene, "On Battle Start: Shy", unit.id);
				await popText(scene, "+3 defense", unit.id);
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
		onBattleStart: async (unit) => {

			if (unit.position.x !== FRONTLINE) return;

			unit.statuses["brave"] = Infinity;

			await popText(scene, "On Battle Start: Brave", unit.id);
			await popText(scene, "+10 attack", unit.id);

			unit.attack += 5;
		},
	},
	targetUnitHandlers: {
		onAttackByMe: async (unit, target) => {
			if (!unit.statuses["brave"]) return
			await popText(scene, "On Attack: Brave", unit.id);
			await popText(scene, "+1 attack", unit.id);
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

export async function runUnitHandlers(handler: keyof UnitHandlerIndex) {
	const promises = state.battleData.units.flatMap(unit => {
		return unit.traits.reduce((xs, traitId) => {
			const trait = getTrait(traitId);

			if (trait.unitHandlers && trait.unitHandlers[handler]) {
				const handlerFn = trait.unitHandlers[handler];
				return xs.concat([async () => await handlerFn!(unit)]);
			} else {
				return xs;
			}
		}, [] as (() => Promise<void>)[]);
	});

	await runPromisesInOrder(promises);
}


// Future traits: check docs/traits/md

export const traits: { [id: TraitId]: Trait } = {
	[SHY.id]: SHY,
	[BRAVE.id]: BRAVE,
};
