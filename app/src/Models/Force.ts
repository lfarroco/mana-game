import * as uuid from "uuid"

export type Force = {
	id: string;
	name: string;
	color: string;
	squads: string[];
};

export const makeForce = {
	id: uuid.v4(),
	name: "",
	color: "",
	squads: []
}