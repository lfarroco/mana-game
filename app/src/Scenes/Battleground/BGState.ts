import { City } from "../../Models/City";
import { Force } from "../../Models/Force";
import { Squad } from "../../Models/Squad";
import { Unit } from "../../Models/Unit";

export const initialState: BGState = {
	forces: [],
	squads: [],
	units: [],
	cities: []
};

export type BGState = {
	forces: Force[];
	squads: Squad[];
	units: Unit[];
	cities: City[]
};

export const getState = (): BGState => {
	//@ts-ignore
	return window.state
}

export const setState = (state: BGState) => {
	//@ts-ignore
	window.state = state
}