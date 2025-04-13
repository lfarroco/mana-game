import { Unit } from "./Unit";

export type Force = {
	id: string;
	name: string;
	color: string;
	gold: number;
	income: number;
	items: string[];
	hp: number;
	units: Unit[]
};

export const makeForce = (id: string): Force => ({
	id,
	name: "",
	color: "",
	gold: 10,
	income: 5,
	hp: 50,
	units: [],
	items: [
		'icon/fireball',
		'icon/arcane_missiles',
		'icon/feint',
		'icon/quest',
		"icon/chest_small",
		"icon/chest_medium",
		"icon/chest_large",
		'icon/fruits',
		'icon/endurance_training',
	]
});

export const FORCE_ID_PLAYER = "PLAYER"

export const FORCE_ID_CPU = "CPU"

export const playerForce = makeForce(FORCE_ID_PLAYER)
export const cpuForce = makeForce(FORCE_ID_CPU)