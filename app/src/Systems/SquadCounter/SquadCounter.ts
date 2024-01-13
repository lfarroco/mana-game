import { Vec2, eqVec2 } from "../../Models/Geometry";
import { emit, events, listeners } from "../../Models/Signals";
import { State } from "../../Models/State";

// TODO: future feature

export function init(state: State) {

	listeners([
		[events.SQUAD_MOVED_INTO_CELL, (squadId: string, vec: Vec2) => {

			const squad = state.squads.find(sqd => sqd.id === squadId)

			if (!squad) throw new Error("squad not found")

			const squadsInCell = state.squads
				.filter(sqd => sqd.force === squad.force)
				.filter(s => eqVec2(squad.position, s.position))

			emit(events.UPDATE_SQUAD_COUNTER, squadsInCell.length, vec)

		}],
		[events.SQUAD_LEAVES_CELL, (squadId: string, vec: Vec2) => {

			const squadsInCell = state.squads
				.filter(sqd => sqd.force === state.squads.find(sqd => sqd.id === squadId)?.force)
				.filter(s => eqVec2(vec, s.position))

			emit(events.UPDATE_SQUAD_COUNTER, squadsInCell.length, vec)

		}
		]
	])

}