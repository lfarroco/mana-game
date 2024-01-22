import * as uuid from "uuid"

export type Force = {
	id: string;
	name: string;
	color: string;
	squads: string[];
	gold: number;
};

export const makeForce = () => ({
	id: uuid.v4(),
	name: "",
	color: "",
	squads: [],
	gold: 0,
});
export const FORCE_ID_PLAYER = "PLAYER"

export const FORCE_ID_CPU = "CPU"
