import { Force } from "../../Models/Force";
import { Squad } from "../../Models/Squad";
import { Unit } from "../../Models/Unit";

export const initialState: BGState = {
	forces: [],
	squads: [],
	units: [],

};
export type BGState = {
	forces: Force[];
	squads: Squad[];
	units: Unit[]
};
