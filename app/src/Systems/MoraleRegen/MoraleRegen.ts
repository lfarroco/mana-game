import { emit, events, listeners } from "../../Models/Signals";
import { SQUAD_STATUS } from "../../Models/Squad";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

const MORALE_REGEN_RATE = 3;

export function init(scene: BattlegroundScene) {

	listeners([
		[events.BATTLEGROUND_TICK, () => {

			const squads = scene.state.squads
				.filter(squad => squad.status === SQUAD_STATUS.IDLE)
				.filter(squad => squad.morale < 100)

			squads.forEach(squad => {
				const newMorale = squad.morale + MORALE_REGEN_RATE;

				if (newMorale >= 100) {
					emit(events.UPDATE_SQUAD_MORALE, squad.id, 100)
				} else {
					emit(events.UPDATE_SQUAD_MORALE, squad.id, newMorale)
				}
			});

		}]
	])

}