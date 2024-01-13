import * as Easystar from "easystarjs"
import { Vec2, asVec2 } from "../../../Models/Misc";
import { emit, events, listeners } from "../../../Models/Signals";


export function init(grid: number[][]) {

	const easystar = new Easystar.js();

	easystar.setAcceptableTiles([0]);

	easystar.setGrid(grid);

	listeners([
		[events.LOOKUP_PATH, (key: string, source: Vec2, target: Vec2) => {

			easystar.findPath(source.x, source.y, target.x, target.y, path => {

				const path_ = path.map(asVec2);
				emit(events.PATH_FOUND, key, path_);

			});
			easystar.calculate();
		}]
	])
}