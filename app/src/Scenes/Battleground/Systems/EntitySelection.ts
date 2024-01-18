import { Vec2 } from "../../../Models/Geometry";
import { events, listeners } from "../../../Models/Signals";
import BattlegroundScene from "../BattlegroundScene";


export function init(scene: BattlegroundScene) {

	listeners([
		[events.UNITS_SELECTED, (units: string[]) => {

			scene.state.selectedUnits = units

		}],
		[
			events.SELECT_SQUAD_MOVE_DONE, (sqdIds: string[], target: Vec2) => {



			}
		]

	])

}