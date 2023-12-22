import { State, getState } from "./State";
import { FORCE_ID_PLAYER } from "./Force";
import { BoardVec, boardVec } from "./Misc";

export type Squad = {
	path: { x: number; y: number }[]
	id: string,
	leader: string,
	name: string,
	force: string,
	dispatched: boolean,
	morale: number,
	position: BoardVec,
	members: string[],
	engaged: boolean,
	isRetreating: boolean
}

export const makeSquad = (id: string, force: string): Squad => ({
	id,
	name: "",
	force,
	leader: "",
	dispatched: false,
	morale: 100,
	position: boardVec(0, 0),
	members: [],
	path: [],
	engaged: false,
	isRetreating: false
});

export function getDispatchableSquads(state: State) {
	return state.squads
		.filter(squad => !squad.dispatched)
		.filter(squad => squad.force === FORCE_ID_PLAYER);
}

export const getMembers = (squad: Squad) => {
	const state = getState();
	const members = squad.members.map(id => {
		const unit = state.units.find(unit => unit.id === id)

		if (!unit) {
			throw new Error(`Unit ${id} not found`)
		}
		return unit

	});

	return members;
}