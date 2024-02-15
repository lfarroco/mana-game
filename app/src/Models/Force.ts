import * as uuid from "uuid"

export type Force = {
	id: string;
	name: string;
	color: string;
	units: string[];
	gold: number;
};

export const makeForce = (): Force => ({
	id: uuid.v4(),
	name: "",
	color: "",
	units: [],
	gold: 0,
});
export const FORCE_ID_PLAYER = "PLAYER"

export const FORCE_ID_CPU = "CPU"
