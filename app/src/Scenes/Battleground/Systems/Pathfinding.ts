import * as Easystar from "easystarjs"
import { Vec2, asVec2, eqVec2 } from "../../../Models/Geometry";
import { emit, events, listeners } from "../../../Models/Signals";
import { getState } from "../../../Models/State";


export function init(grid: number[][]) {


	listeners([
		[events.LOOKUP_PATH, (key: string, source: Vec2, target: Vec2) => {

			const easystar = new Easystar.js();
			easystar.setAcceptableTiles([0]);
			easystar.setGrid(grid);

			const state = getState()

			const otherSquads = state.squads.filter(s => s.id !== key)

			// make tile with othersquads unwalkable

			otherSquads.forEach(squad => {

				//except for target
				if (eqVec2(squad.position, target)) return;
				easystar.avoidAdditionalPoint(squad.position.x, squad.position.y)
			})


			easystar.findPath(source.x, source.y, target.x, target.y, path => {

				if (!path) return;

				const path_ = path.map(asVec2);
				emit(events.PATH_FOUND, key, path_);

			});
			easystar.calculate();
		}]
	])
}