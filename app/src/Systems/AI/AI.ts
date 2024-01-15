import { FORCE_ID_CPU } from "../../Models/Force";
import { eqVec2 } from "../../Models/Geometry";
import { emit, events, listeners } from "../../Models/Signals";
import { SQUAD_STATUS, Squad } from "../../Models/Squad";
import { getState } from "../../Models/State";
import { distanceBetween } from "../../Models/Geometry";


export function init() {

	listeners([
		[events.BATTLEGROUND_TICK, processAttackerActions],
		[events.BATTLEGROUND_TICK, processDefenderActions]
	])

}

function processAttackerActions() {

	const state = getState();

	if (state.winner) return

	(state.ai.attackers
		.map(id => state.squads.find(squad => squad.id === id))
		.filter(squad => squad) as Squad[]
	)
		.forEach(sqd => {

			//find closest city
			const closestCity = state.cities
				.filter(city => city.force === FORCE_ID_CPU)
				.sort((a, b) => {
					const distA = distanceBetween(a.boardPosition)(sqd.position);
					const distB = distanceBetween(b.boardPosition)(sqd.position);
					return distA - distB;
				})[0];


			if (!closestCity) {
				console.error("no closest city found");
				return;
			}

			if (sqd.status === SQUAD_STATUS.IDLE && sqd.stamina >= 80) {
				console.log("AI: attacking", sqd.id, closestCity.boardPosition)

				// is currently at a city? if so, wait to recharge all stamina
				if (eqVec2(closestCity.boardPosition, sqd.position) && sqd.stamina < 100) {
					return;
				}
				// find a path
				// enemy castle
				const target = state.cities.find(city => city.force !== FORCE_ID_CPU && city.type === "castle");
				if (!target) {
					console.error("no target");
					return;
				}
				emit(events.SELECT_SQUAD_MOVE_DONE, sqd.id, target.boardPosition)
				return;
			}

			if (sqd.status === SQUAD_STATUS.IDLE && sqd.stamina < 80) {

				console.log("AI: moving", sqd.id, closestCity.boardPosition)


				//is in an allied city?
				if (eqVec2(closestCity.boardPosition, sqd.position)) {
					return;
				}
				emit(events.SELECT_SQUAD_MOVE_DONE, sqd.id, closestCity.boardPosition)
			}

		})


}
function processDefenderActions() {

	const state = getState();

	if (state.winner) return

	(state.ai.defenders
		.map(id => state.squads.find(squad => squad.id === id))
		.filter(squad => squad) as Squad[]
	)
		.forEach(sqd => {
			//find closest city
			const [closestCity] = state.cities
				.filter(city => city.force === FORCE_ID_CPU)
				.sort((a, b) => {
					const distA = distanceBetween(a.boardPosition)(sqd.position);
					const distB = distanceBetween(b.boardPosition)(sqd.position);
					return distA - distB;
				});

			if (!closestCity) {
				console.error("no closest city found");
				return;
			}

			if (eqVec2(closestCity.boardPosition, sqd.position)) {
				return;
			}

			if (sqd.status === SQUAD_STATUS.IDLE) {
				console.log("AI: moving", sqd.id, closestCity.boardPosition)
				emit(events.SELECT_SQUAD_MOVE_DONE, sqd.id, closestCity.boardPosition)
				return;
			}

		});
}