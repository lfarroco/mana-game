import { City } from "../../Models/City";
import { Force, makeForce } from "../../Models/Force";
import { windowVec } from "../../Models/Misc";
import { Squad } from "../../Models/Squad";
import { Unit, makeUnit } from "../../Models/Unit";

export const initialState: BGState = {
	forces: [
		{
			...makeForce(),
			id: "PLAYER",
			name: "Player",
			color: "#00ff00",
			squads: [
				"s1", "s2"
			]
		}
	],
	squads: [

		{
			id: "s1",
			name: "squad-1",
			force: "PLAYER",
			dispatched: false,
			path: [],
			position: windowVec(0, 0),
			members: {
				1: {
					1: "u1",
					2: "u2"
				}
			}
		},
		{
			id: "s2",
			name: "squad-2",
			force: "PLAYER",
			dispatched: false,
			path: [],
			position: windowVec(0, 0),
			members: {
				1: {
					1: "u3",
					2: "u4"
				}
			}
		},
	],
	units: [
		{ ...makeUnit(), id: "u1", squad: "s1", force: "PLAYER", job: "soldier" },
		{ ...makeUnit(), id: "u2", squad: "s1", force: "PLAYER", job: "soldier" },
		{ ...makeUnit(), id: "u3", squad: "s2", force: "PLAYER", job: "soldier" },
		{ ...makeUnit(), id: "u4", squad: "s2", force: "PLAYER", job: "soldier" },
	],
	cities: [],
	selectedEntity: null,
};

export type BGState = {
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