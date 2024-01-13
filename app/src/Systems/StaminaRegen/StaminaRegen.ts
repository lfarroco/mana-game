import { eqVec2 } from "../../Models/Geometry";
import { emit, events, listeners } from "../../Models/Signals";
import { SQUAD_STATUS } from "../../Models/Squad";
import { State } from "../../Models/State";

const STAMINA_REGEN_RATE = 3;

export function init(state: State) {

	listeners([
		[events.BATTLEGROUND_TICK, () => {

			state.squads
				.filter(squad => squad.status === SQUAD_STATUS.IDLE)
				.filter(squad => squad.stamina < 100)
				.filter(squad => state.cities.some(
					city => eqVec2(city.boardPosition, squad.position)
				))
				.forEach(squad => {
					const newStamina = squad.stamina + STAMINA_REGEN_RATE;

					if (newStamina >= 100) {
						emit(events.UPDATE_SQUAD, squad.id, { stamina: 100 })
					} else {
						emit(events.UPDATE_SQUAD, squad.id, { stamina: newStamina })
					}
				});

		}]
	])

}