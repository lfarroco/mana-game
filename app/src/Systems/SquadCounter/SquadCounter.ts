import { Vec2, eqVec2 } from "../../Models/Geometry";
import { emit, signals, listeners } from "../../Models/Signals";
import { State, getSquad } from "../../Models/State";

// TODO: future feature

export function init(state: State) {

	listeners([
		[signals.SQUAD_MOVED_INTO_CELL, (squadId: string, vec: Vec2) => {

			const squad = getSquad(state)(squadId)

			const squadsInCell = state.gameData.squads
				.filter(sqd => sqd.force === squad.force)
				.filter(s => eqVec2(squad.position, s.position))

			emit(signals.UPDATE_SQUAD_COUNTER, squadsInCell.length, vec)

		}],
		[signals.SQUAD_LEAVES_CELL, (squadId: string, vec: Vec2) => {

			const squadsInCell = state.gameData.squads
				.filter(sqd => sqd.force === state.gameData.squads.find(sqd => sqd.id === squadId)?.force)
				.filter(s => eqVec2(vec, s.position))

			emit(signals.UPDATE_SQUAD_COUNTER, squadsInCell.length, vec)

		}
		]
	])

}