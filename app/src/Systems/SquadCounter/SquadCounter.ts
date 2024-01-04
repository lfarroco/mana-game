import { BoardVec, isSameBoardVec } from "../../Models/Misc";
import { emit, events, listeners } from "../../Models/Signals";
import { State } from "../../Models/State";

// TODO: future feature

export function init(state: State) {

	listeners([
		[events.SQUAD_MOVED_INTO_CELL, (squadId: string, vec: BoardVec) => {

			const squad = state.squads.find(sqd => sqd.id === squadId)

			if (!squad) throw new Error("squad not found")

			const squadsInCell = state.squads
				.filter(sqd => sqd.force === squad.force)
				.filter(s => isSameBoardVec(squad.position, s.position))

			emit(events.UPDATE_SQUAD_COUNTER, squadsInCell.length, vec)

		}],
		[events.SQUAD_LEAVES_CELL, (squadId: string, vec: BoardVec) => {

			const squadsInCell = state.squads
				.filter(sqd => sqd.force === state.squads.find(sqd => sqd.id === squadId)?.force)
				.filter(s => isSameBoardVec(vec, s.position))

			emit(events.UPDATE_SQUAD_COUNTER, squadsInCell.length, vec)

		}
		]
	])

}