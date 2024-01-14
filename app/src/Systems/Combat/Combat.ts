import { vec2 } from "../../Models/Geometry";
import { listeners, events, emit, Operation, operations } from "../../Models/Signals";
import { SQUAD_STATUS, Squad } from "../../Models/Squad";
import { State } from "../../Models/State";
import { moraleDamage } from "./moraleDamage";
import { staminaDamage } from "./staminaDamage";
import { Engagement } from "../Engagement/Engagement";

//todo: combat == engagement
export function init(state: State) {

	listeners([
		[events.BATTLEGROUND_TICK, () => {
			const events = processCombat(state);

			events.forEach(([event, ...args]) => {
				emit(event, ...args)
			});
		}]
	])

}


export function processCombat(state: State): Operation[] {

	return []
}





function getRandomEmptyCell(squad: Squad, state: State): Operation {
	const emptyCells = [
		[0, 1],
		[0, -1],
		[1, 0],
		[-1, 0],
	].filter(([x, y]) => {
		if (squad.position.x + x < 0 || squad.position.x + x >= state.map.width) return false;
		if (squad.position.y + y < 0 || squad.position.y + y >= state.map.height) return false;

		const cell = state.squads.find(sqd => sqd.position.x === squad.position.x + x && sqd.position.y === squad.position.y + y);
		return !cell;
	});

	if (emptyCells.length > 0) {
		const [x, y] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
		return operations.UPDATE_SQUAD(squad.id, { path: [vec2(squad.position.x + x, squad.position.y + y)] })
	} else {
		return operations.SQUAD_DESTROYED(squad.id)
	}
}

