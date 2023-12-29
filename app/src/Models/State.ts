import { Engagement } from "../Systems/Engagement/Engagement";
import { City } from "./City";
import { FORCE_ID_PLAYER, Force, makeForce } from "./Force";
import { boardVec } from "./Misc";
import { SQUAD_STATUS, Squad, makeSquad } from "./Squad";
import { Unit, makeUnit } from "./Unit";

export const initialState = (): State => ({
	debug: true,
	speed: 4,
	tick: 0,
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
			leader: "u1",
			members: ["u1", "u2"],
			status: SQUAD_STATUS.IDLE,
			position: boardVec(1, 1)
		},
		{
			...makeSquad("s2", FORCE_ID_PLAYER),
			name: "squad-2",
			leader: "u3",
			members: ["u3", "u4"],
			status: SQUAD_STATUS.IDLE,
			position: boardVec(1, 1)
		},
		{
			...makeSquad("s3", FORCE_ID_PLAYER),
			name: "squad-3",
			leader: "u30",
			members: ["u30", "u31"],
			status: SQUAD_STATUS.IDLE,
			position: boardVec(2, 0)
		},
		{
			...makeSquad("s4", FORCE_ID_PLAYER),
			name: "squad-4",
			leader: "u40",
			members: ["u40", "u41"],
			status: SQUAD_STATUS.IDLE,
			position: boardVec(3, 1)
		},
		{
			...makeSquad("s5", FORCE_ID_PLAYER),
			name: "squad-5",
			leader: "u50",
			members: ["u50", "u51"],
			status: SQUAD_STATUS.IDLE,
			position: boardVec(2, 2)
		},
	],
	units: [
		{ ...makeUnit(), id: "u1", squad: "s1", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u2", squad: "s1", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u3", squad: "s2", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u4", squad: "s2", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u30", squad: "s3", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u31", squad: "s3", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u40", squad: "s4", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u41", squad: "s4", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u50", squad: "s5", force: FORCE_ID_PLAYER, job: "knight" },
		{ ...makeUnit(), id: "u51", squad: "s5", force: FORCE_ID_PLAYER, job: "knight" },
	],
	cities: [],
	selectedEntity: null,
	engagements: [],
	map: {
		width: 0,
		height: 0
	}
});

export type State = {
	debug: boolean;
	speed: number;
	tick: number; // TODO: remove tick from scene
	forces: Force[];
	squads: Squad[];
	units: Unit[];
	cities: City[];
	selectedEntity: null | { type: string, id: string };
	engagements: Engagement[],
	map: {
		width: number;
		height: number;
	}
};

export const getState = (): State => {
	//@ts-ignore
	return window.state
}

export const setState = (state: State) => {
	//@ts-ignore
	window.state = state
}