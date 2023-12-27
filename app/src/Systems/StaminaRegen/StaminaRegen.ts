import { emit, events, listeners } from "../../Models/Signals";
import { SQUAD_STATUS } from "../../Models/Squad";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

const STAMINA_REGEN_RATE = 3;

export function init(scene: BattlegroundScene) {

	listeners([
		[events.BATTLEGROUND_TICK, () => {

			const squads = scene.state.squads
				.filter(squad => squad.status === SQUAD_STATUS.IDLE)
				.filter(squad => squad.stamina < 100)
				.filter(squad => scene.state.cities.some(city => city.boardPosition.x === squad.position.x && city.boardPosition.y === squad.position.y))

			squads.forEach(squad => {
				const newStamina = squad.stamina + STAMINA_REGEN_RATE;

				if (newStamina >= 100) {
					emit(events.UPDATE_SQUAD_STAMINA, squad.id, 100)
				} else {
					emit(events.UPDATE_SQUAD_STAMINA, squad.id, newStamina)
				}
			});

		}]
	])

}