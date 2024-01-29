import { FORCE_ID_CPU } from "../../Models/Force";
import { eqVec2 } from "../../Models/Geometry";
import { emit, events, listeners } from "../../Models/Signals";
import { UNIT_STATUS_KEYS, Unit } from "../../Models/Unit";
import { State } from "../../Models/State";
import { distanceBetween } from "../../Models/Geometry";


export function init(state: State) {

	listeners([
		[events.BATTLEGROUND_TICK, () => processAttackerActions(state)],
		[events.BATTLEGROUND_TICK, () => processDefenderActions(state)]
	])

}

function processAttackerActions(state: State) {

	if (state.gameData.winner) return

	(state.gameData.ai.attackers
		.map(id => state.gameData.squads.find(squad => squad.id === id))
		.filter(squad => squad) as Unit[]
	)
		.forEach(sqd => {

			//find closest city
			const closestCity = state.gameData.cities
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

			if (sqd.status.type === UNIT_STATUS_KEYS.IDLE && sqd.hp >= 80) {
				console.log("AI: attacking", sqd.id, closestCity.boardPosition)

				// is currently at a city? if so, wait to recharge all stamina
				if (eqVec2(closestCity.boardPosition, sqd.position) && sqd.hp < 100) {
					return;
				}
				// find a path
				// enemy castle
				const target = state.gameData.cities.find(city => city.force !== FORCE_ID_CPU && city.type === "castle");
				if (!target) {
					console.error("no target");
					return;
				}
				emit(events.SELECT_SQUAD_MOVE_DONE, sqd.id, target.boardPosition)
				return;
			}

			if (sqd.status.type === UNIT_STATUS_KEYS.IDLE && sqd.hp < 80) {

				console.log("AI: moving", sqd.id, closestCity.boardPosition)


				//is in an allied city?
				if (eqVec2(closestCity.boardPosition, sqd.position)) {
					return;
				}
				emit(events.SELECT_SQUAD_MOVE_DONE, sqd.id, closestCity.boardPosition)
			}

		})


}
function processDefenderActions(state: State) {

	if (state.gameData.winner) return

	(state.gameData.ai.defenders
		.map(id => state.gameData.squads.find(squad => squad.id === id))
		.filter(squad => squad) as Unit[]
	)
		.forEach(sqd => {
			//find closest city
			const [closestCity] = state.gameData.cities
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

			if (sqd.status.type === UNIT_STATUS_KEYS.IDLE) {
				console.log("AI: moving", sqd.id, closestCity.boardPosition)
				emit(events.SELECT_SQUAD_MOVE_DONE, sqd.id, closestCity.boardPosition)
				return;
			}

		});
}
