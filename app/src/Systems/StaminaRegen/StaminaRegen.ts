import { eqVec2 } from "../../Models/Geometry";
import { emit, signals, listeners } from "../../Models/Signals";
import { UNIT_STATUS_KEYS } from "../../Models/Unit";
import { State } from "../../Models/State";

const STAMINA_REGEN_RATE = 3;

export function init(state: State) {

	listeners([
		[signals.BATTLEGROUND_TICK, () => {

			state.gameData.units
				.filter(unit => unit.status.type === UNIT_STATUS_KEYS.IDLE)
				.filter(unit => unit.hp < unit.maxHp)
				.filter(unit => state.gameData.cities.some(
					city => eqVec2(city.boardPosition, unit.position)
				))
				.forEach(unit => {
					const newHP = unit.hp + STAMINA_REGEN_RATE;

					if (newHP >= unit.maxHp) {
						emit(signals.UPDATE_UNIT, unit.id, { hp: unit.maxHp })
					} else {
						emit(signals.UPDATE_UNIT, unit.id, { hp: newHP })
					}
				});

		}]
	])

}
