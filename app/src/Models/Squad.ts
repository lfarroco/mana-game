import { State, getState } from "./State";
import { FORCE_ID_PLAYER } from "./Force";
import { BoardVec, boardVec } from "./Misc";

export type SquadStatus = "NON_DISPATCHED" | "MOVING" | "ENGAGED" | "RETREATING" | "DESTROYED" | "IDLE"

export const SQUAD_STATUS: Record<SquadStatus, SquadStatus> = {
	NON_DISPATCHED: "NON_DISPATCHED",
	MOVING: "MOVING",
	ENGAGED: "ENGAGED",
	RETREATING: "RETREATING",
	DESTROYED: "DESTROYED",
	IDLE: "IDLE"
}

export type Squad = {
	path: { x: number; y: number }[]
	id: string,
	leader: string,
	name: string,
	force: string,
	morale: number,
	stamina: number,
	position: BoardVec,
	members: string[],
	status: SquadStatus,
}

export const makeSquad = (id: string, force: string): Squad => ({
	id,
	name: "",
	force,
	leader: "",
	morale: 100,
	stamina: 100,
	position: boardVec(0, 0),
	members: [],
	path: [],
	status: SQUAD_STATUS.NON_DISPATCHED,
});

export function getPlayerDispatchableSquads(state: State) {
	return state.squads
		.filter(squad => squad.status === SQUAD_STATUS.NON_DISPATCHED)
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