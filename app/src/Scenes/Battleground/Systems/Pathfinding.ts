import * as Easystar from "easystarjs"
import { BoardVec, asBoardVec } from "../../../Models/Misc";
import { emit, events, listeners } from "../../../Models/Signals";


export function init() {

	const easystar = new Easystar.js();

	easystar.setAcceptableTiles([0])

	listeners([
		[events.SET_GRID, (grid: number[][]) => { easystar.setGrid(grid); }],
		[events.LOOKUP_PATH, (key: string, source: BoardVec, target: BoardVec) => {

			easystar.findPath(source.x, source.y, target.x, target.y, path => {

				const p_ = path.map(asBoardVec)
				emit(events.PATH_FOUND, key, p_)
			});
			easystar.calculate();
		}]
	])
}