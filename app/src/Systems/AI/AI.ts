import { FORCE_ID_CPU } from "../../Models/Force";
import { emit, events, listeners } from "../../Models/Signals";
import { SQUAD_STATUS, Squad } from "../../Models/Squad";
import { getState } from "../../Models/State";


export function init() {

	listeners([
		[events.BATTLEGROUND_TICK, processTick]
	])

}

function processTick() {

	const state = getState();

	(state.ai.attackers
		.map(id => state.squads.find(squad => squad.id === id))
		.filter(squad => squad) as Squad[]
	)
		.forEach(sqd => {

			if (sqd.status === SQUAD_STATUS.IDLE) {
				// find a path
				// enemy castle
				const target = state.cities.find(city => city.force !== FORCE_ID_CPU && city.type === "castle");
				if (!target) {
					console.error("no target");
					return;
				}
				emit(events.SELECT_SQUAD_MOVE_DONE, sqd.id, target.boardPosition)
			}


		})


}