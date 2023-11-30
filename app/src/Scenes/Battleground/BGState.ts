import { City } from "../../Models/City";
import { FORCE_ID_PLAYER, Force, makeForce } from "../../Models/Force";
import { Squad, makeSquad } from "../../Models/Squad";
import { Unit, makeUnit } from "../../Models/Unit";

export const initialState: BGState = {
	debug: true,
	speed: 4,
	forces: [
		{
			...makeForce(),
			id: FORCE_ID_PLAYER,
			name: "Player",
			color: "#00ff00",
			squads: ["s1", "s2"]
		}
	],
	squads: [

		{
			...makeSquad("s1", FORCE_ID_PLAYER),
			name: "squad-1",
			members: ["u1", "u2"],
		},
		{
			...makeSquad("s2", FORCE_ID_PLAYER),
			name: "squad-2",
			members: ["u3", "u4"]
		},
	],
	units: [
		{ ...makeUnit(), id: "u1", squad: "s1", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u2", squad: "s1", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u3", squad: "s2", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u4", squad: "s2", force: FORCE_ID_PLAYER, job: "knight" },
	],
	cities: [],
	selectedEntity: null,
};

export type BGState = {
	debug: boolean;
	speed: number;
	forces: Force[];
	squads: Squad[];
	units: Unit[];
	cities: City[];
	selectedEntity: null | { type: string, id: string }
};

export const getState = (): BGState => {
	//@ts-ignore
	return window.state
}

export const setState = (state: BGState) => {
	//@ts-ignore
	window.state = state
}