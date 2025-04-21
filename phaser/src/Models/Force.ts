import { Item, ITEMS } from "./Item";
import { Unit } from "./Unit";

export type Force = {
	id: string;
	name: string;
	color: string;
	gold: number;
	income: number;
	items: (Item | null)[]; // todo: replace with map
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
		ITEMS.RED_POTION(),
		ITEMS.IRON_SWORD(),
	]
});

export const FORCE_ID_PLAYER = "PLAYER"

export const FORCE_ID_CPU = "CPU"

export const playerForce = makeForce(FORCE_ID_PLAYER)
export const cpuForce = makeForce(FORCE_ID_CPU)