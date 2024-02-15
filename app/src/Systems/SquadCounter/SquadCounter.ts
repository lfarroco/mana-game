import { Vec2, eqVec2 } from "../../Models/Geometry";
import { emit, signals, listeners } from "../../Models/Signals";
import { State, getUnit } from "../../Models/State";

// TODO: future feature

export function init(state: State) {

	listeners([
		[signals.UNIT_MOVED_INTO_CELL, (unitId: string, vec: Vec2) => {

			const unit = getUnit(state)(unitId)

			const squadsInCell = state.gameData.units
				.filter(u => u.force === unit.force)
				.filter(s => eqVec2(unit.position, s.position))

			emit(signals.UPDATE_UNIT_COUNTER, squadsInCell.length, vec)

		}],
		[signals.UNIT_LEAVES_CELL, (unitId: string, vec: Vec2) => {

			const squadsInCell = state.gameData.units
				.filter(u => u.force === state.gameData.units.find(u => u.id === unitId)?.force)
				.filter(s => eqVec2(vec, s.position))

			emit(signals.UPDATE_UNIT_COUNTER, squadsInCell.length, vec)

		}
		]
	])

}