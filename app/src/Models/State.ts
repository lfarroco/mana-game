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
			position: boardVec(2, 2)
		},
		{
			...makeSquad("s2", FORCE_ID_PLAYER),
			name: "squad-2",
			leader: "u3",
			members: ["u3", "u4"],
			status: SQUAD_STATUS.IDLE,
			position: boardVec(3, 1)
		},

		{
			...makeSquad("s4", FORCE_ID_PLAYER),
			name: "squad-4",
			leader: "u40",
			members: ["u40", "u41"],
			status: SQUAD_STATUS.IDLE,
			position: boardVec(4, 2)
		},
		{
			...makeSquad("s5", FORCE_ID_PLAYER),
			name: "squad-5",
			leader: "u50",
			members: ["u50", "u51"],
			status: SQUAD_STATUS.IDLE,
			position: boardVec(3, 3)
		},
	],
	units: [
		{ ...makeUnit(), id: "u1", squad: "s1", force: FORCE_ID_PLAYER, job: "soldier" },
		{ ...makeUnit(), id: "u2", squad: "s1", force: FORCE_ID_PLAYER, job: "barbarian" },
		{ ...makeUnit(), id: "u3", squad: "s2", force: FORCE_ID_PLAYER, job: "rogue" },
		{ ...makeUnit(), id: "u4", squad: "s2", force: FORCE_ID_PLAYER, job: "rogue" },
		{ ...makeUnit(), id: "u30", squad: "s3", force: FORCE_ID_PLAYER, job: "rogue" },
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
		width: 128,
		height: 128
	},
	grid: []
});

// make it an ioref https://gcanti.github.io/fp-ts/modules/IORef.ts.html#ioref-overview
export type State = {
	debug: boolean;
	speed: number;
	tick: number; // TODO: remove tick from scene
	forces: Force[];
	squads: Squad[];
	grid: number[][];
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

export const addForce = (s: State) => (force: Force) => {
	s.forces.push(force)
}

export const addSquad = (s: State) => (squad: Squad) => {
	s.squads.push(squad)
}

export const addUnit = (s: State) => (unit: Unit) => {
	s.units.push(unit)
}

export const addCity = (s: State) => (city: City) => {
	s.cities.push(city)
}

export const addEngagement = (s: State) => (engagement: Engagement) => {
	s.engagements.push(engagement)
}

export const updateSquad = (s: State) => (id: string) => (sqd: Partial<Squad>) => {
	const squad = s.squads.find(sqd => sqd.id === id)
	if (!squad) throw new Error("squad not found")
	Object.assign(squad, sqd)
}