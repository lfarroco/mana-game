import { BoardVec, boardVec } from "./Misc";

export type SquadStatus = "MOVING" | "ENGAGED" | "RETREATING" | "DESTROYED" | "IDLE"

export const SQUAD_STATUS: Record<SquadStatus, SquadStatus> = {
	MOVING: "MOVING",
	ENGAGED: "ENGAGED",
	RETREATING: "RETREATING",
	DESTROYED: "DESTROYED",
	IDLE: "IDLE"
}

export type Squad = {
	path: BoardVec[]
	id: string,
	name: string,
	job: string,
	force: string,
	morale: number,
	maxMorale: number,
	stamina: number,
	maxStamina: number,
	attack: number,
	defense: number,
	position: BoardVec,
	status: SquadStatus,
}

export const makeSquad = (id: string, force: string): Squad => ({
	id,
	name: "",
	job: "knight",
	force,
	morale: 100,
	maxMorale: 100,
	stamina: 100,
	maxStamina: 100,
	attack: 10,
	defense: 5,
	position: boardVec(0, 0),
	path: [],
	status: SQUAD_STATUS.IDLE,
});