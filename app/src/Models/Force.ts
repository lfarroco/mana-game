
export type Force = {
	id: string;
	name: string;
	color: string;
	maxUnits: number;
	gold: number;
	hp: number;
};

export const makeForce = (id: string): Force => ({
	id,
	name: "",
	color: "",
	gold: 10,
	maxUnits: 6,
	hp: 50,
});

export const FORCE_ID_PLAYER = "PLAYER"

export const FORCE_ID_CPU = "CPU"

export const playerForce = makeForce(FORCE_ID_PLAYER)
export const cpuForce = makeForce(FORCE_ID_CPU)