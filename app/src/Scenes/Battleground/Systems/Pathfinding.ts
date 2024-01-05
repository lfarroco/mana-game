import * as Easystar from "easystarjs"
import { BoardVec, asBoardVec } from "../../../Models/Misc";
import { emit, events, listeners } from "../../../Models/Signals";


export function init(grid: number[][]) {

	const easystar = new Easystar.js();

	easystar.setAcceptableTiles([0]);

	easystar.setGrid(grid);

	listeners([
		[events.LOOKUP_PATH, (key: string, source: BoardVec, target: BoardVec) => {

			easystar.findPath(source.x, source.y, target.x, target.y, path => {

				const path_ = path.map(asBoardVec);
				emit(events.PATH_FOUND, key, path_);

			});
			easystar.calculate();
		}]
	])
}