import { Engagement } from "../Systems/Engagement/Engagement";
import { City } from "./City";
import { FORCE_ID_PLAYER, Force, makeForce } from "./Force";
import { vec2 } from "./Misc";
import { SQUAD_STATUS, Squad, makeSquad } from "./Squad";

export const initialState = (): State => ({
	debug: true,
	speed: 4,
	winner: null,
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
			status: SQUAD_STATUS.IDLE,
			position: vec2(2, 2)
		},
		{
			...makeSquad("s2", FORCE_ID_PLAYER),
			name: "squad-2",
			status: SQUAD_STATUS.IDLE,
			position: vec2(3, 1)
		},
		{
			...makeSquad("s4", FORCE_ID_PLAYER),
			name: "squad-4",
			status: SQUAD_STATUS.IDLE,
			position: vec2(4, 2)
		},
		{
			...makeSquad("s5", FORCE_ID_PLAYER),
			name: "squad-5",
			status: SQUAD_STATUS.IDLE,
			position: vec2(3, 3)
		},
	],
	cities: [],
	selectedEntity: null,
	engagements: [],
	map: {
		width: 128,
		height: 128
	},
	grid: [],
	ai: {
		attackers: [],
		defenders: []
	}
});

// make it an ioref https://gcanti.github.io/fp-ts/modules/IORef.ts.html#ioref-overview
export type State = {
	debug: boolean;
	speed: number;
	winner: null | string;
	ai: {
		attackers: string[];
		defenders: string[];
	};
	tick: number; // TODO: remove tick from scene
	forces: Force[];
	squads: Squad[];
	grid: number[][];
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