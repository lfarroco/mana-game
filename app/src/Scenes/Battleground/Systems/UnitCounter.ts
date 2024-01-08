import { boardVec } from "../../../Models/Misc";
import * as Signals from "../../../Models/Signals";
import { State } from "../../../Models/State";


export function init(state: State) {

	Signals.listeners([
		[Signals.events.BATTLEGROUND_TICK, () => {
			const events = updateCounters(state);
			events.forEach(([event, ...args]) => {
				Signals.emit(event, ...args)
			});
		}]
	])

}

function updateCounters(state: State): Signals.Operation[] {

	const groups = state.squads.reduce((xs, x) => {

		const pos = `${x.position.x},${x.position.y}`

		if (!xs[pos]) xs[pos] = 0

		xs[pos]++

		return xs

	}, {} as { [key: string]: number })

	return Object.entries(groups)
		.map(([pos, count]) => {

			const [x, y] = pos.split(",").map(x => parseInt(x))

			return Signals.operations.UPDATE_UNIT_COUNTER(count, boardVec(x, y))
		});

}