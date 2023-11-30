import { State, getState } from "./State";
import { FORCE_ID_PLAYER } from "./Force";

export type Squad = {
	path: { x: number; y: number }[]
	id: string,
	name: string,
	force: string,
	dispatched: boolean,
	morale: number,
	position: {
		x: number,
		y: number
	},
	members: string[]
}

export const makeSquad = (id: string, force: string): Squad => ({
	id,
	name: "",
	force,
	dispatched: false,
	morale: 100,
	position: { x: 0, y: 0 },
	members: [],
	path: []
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