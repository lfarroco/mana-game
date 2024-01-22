import { eqVec2 } from "../../Models/Geometry";
import { emit, events, listeners } from "../../Models/Signals";
import { UNIT_STATUS } from "../../Models/Unit";
import { State } from "../../Models/State";

const STAMINA_REGEN_RATE = 3;

export function init(state: State) {

	listeners([
		[events.BATTLEGROUND_TICK, () => {

			state.gameData.squads
				.filter(squad => squad.status === UNIT_STATUS.IDLE)
				.filter(squad => squad.hp < squad.maxHp)
				.filter(squad => state.gameData.cities.some(
					city => eqVec2(city.boardPosition, squad.position)
				))
				.forEach(squad => {
					const newHP = squad.hp + STAMINA_REGEN_RATE;

					if (newHP >= squad.maxHp) {
						emit(events.UPDATE_SQUAD, squad.id, { hp: squad.maxHp })
					} else {
						emit(events.UPDATE_SQUAD, squad.id, { hp: newHP })
					}
				});

		}]
	])

}
