import { Vec2, vec2 } from "./Geometry";

export type SquadStatus = "MOVING" | "ENGAGED" | "RETREATING" | "DESTROYED" | "IDLE"

export const SQUAD_STATUS: Record<SquadStatus, SquadStatus> = {
	MOVING: "MOVING",
	ENGAGED: "ENGAGED",
	RETREATING: "RETREATING",
	DESTROYED: "DESTROYED",
	IDLE: "IDLE"
}

export type Squad = {
	path: Vec2[]
	id: string,
	name: string,
	job: string,
	force: string,
	position: Vec2,
	status: SquadStatus,

	// stats
	morale: number,
	maxMorale: number,
	stamina: number,
	maxStamina: number,
	attack: number,
	defense: number,
	mgkAttack: number,
	mgkDefense: number,
	accuracy: number,
	evasion: number,

}

export const makeSquad = (id: string, force: string): Squad => ({
	id,
	name: "",
	job: "knight",
	force,
	position: vec2(0, 0),
	path: [],
	status: SQUAD_STATUS.IDLE,

	morale: 100,
	maxMorale: 100,
	stamina: 100,
	maxStamina: 100,
	attack: 10,
	defense: 10,
	mgkAttack: 10,
	mgkDefense: 10,
	accuracy: 10,
	evasion: 10,
});