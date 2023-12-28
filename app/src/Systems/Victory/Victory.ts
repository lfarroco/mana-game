import { emit, events, listeners } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";


export function init(scene: BattlegroundScene) {

	listeners([
		[
			events.BATTLEGROUND_TICK, () => {

				// check if all cities are captured
				const cities = scene.state.cities.filter(c => c.force !== null)
				if (cities.every(c => c.force === cities[0].force)) {
					const winner = cities[0].force
					scene.scene.pause()
					//scene.scene.sleep()
					emit(events.FORCE_VICTORY, winner)
					return;
				}

			}
		]
	])

}