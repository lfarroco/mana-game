
export type Force = {
	id: string;
	name: string;
	color: string;
	units: string[];
	gold: number;
};

export const makeForce = (id: string): Force => ({
	id,
	name: "",
	color: "",
	units: [],
	gold: 12,
});
export const FORCE_ID_PLAYER = "PLAYER"

export const FORCE_ID_CPU = "CPU"

export const playerForce = makeForce(FORCE_ID_PLAYER)
export const cpuForce = makeForce(FORCE_ID_CPU)