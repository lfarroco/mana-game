import { Vec2 } from "../../Models/Geometry";
import { listeners, events } from "../../Models/Signals";
import { State } from "../../Models/State";

// we have a standalone system, that contains its own logic and state
// - system
// - ui
// - phaser scene
// this structure allows us to keep the system logic separate from the phaser scene and the ui
// using events we can send and receive data between the system and the phaser scene and the ui

export function init(state: State) {

	listeners([
		[events.DISPATCH_SQUAD, (squadId: string) => {

			const squad = state.squads.find(sqd => sqd.id === squadId)
			if (!squad) throw new Error("dispatchSquad: squad not found")

			squad.movementIndex = 0
		}],
		[events.SQUAD_WALKS_TOWARDS_CELL, (squadId: string, vec: Vec2) => {

			const squad = state.squads.find(sqd => sqd.id === squadId)
			if (!squad) throw new Error("dispatchSquad: squad not found")

			squad.movementIndex++;
		}],
		[events.SQUAD_MOVED_INTO_CELL, (squadId: string, vec: Vec2) => {

			const squad = state.squads.find(sqd => sqd.id === squadId)
			if (!squad) throw new Error("dispatchSquad: squad not found")

			squad.movementIndex = 0;
		}],
	])

}