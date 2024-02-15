import { eqVec2 } from "../../Models/Geometry";
import { emit, signals, listeners } from "../../Models/Signals";
import { UNIT_STATUS_KEYS } from "../../Models/Unit";
import { State } from "../../Models/State";

const STAMINA_REGEN_RATE = 3;

export function init(state: State) {

	listeners([
		[signals.BATTLEGROUND_TICK, () => {

			state.gameData.units
				.filter(squad => squad.status.type === UNIT_STATUS_KEYS.IDLE)
				.filter(squad => squad.hp < squad.maxHp)
				.filter(squad => state.gameData.cities.some(
					city => eqVec2(city.boardPosition, squad.position)
				))
				.forEach(squad => {
					const newHP = squad.hp + STAMINA_REGEN_RATE;

					if (newHP >= squad.maxHp) {
						emit(signals.UPDATE_SQUAD, squad.id, { hp: squad.maxHp })
					} else {
						emit(signals.UPDATE_SQUAD, squad.id, { hp: newHP })
					}
				});

		}]
	])

}
