import { emit, events, listeners } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

const MORALE_REGEN_RATE = 3;

export function init(scene: BattlegroundScene) {

	listeners([
		[events.BATTLEGROUND_TICK, () => {

			const squads = scene.state.squads
				.filter(squad => squad.dispatched)
				.filter(squad => !squad.engaged)
				.filter(squad => !squad.isRetreating)
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