import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "../Scenes/Battleground/constants";
import { goldChangeAnimation, scene } from "../Scenes/Battleground/Systems/UIManager";
import { Item } from "./Item";
import { Unit } from "./Unit";

export type Force = {
	id: string;
	name: string;
	color: string;
	gold: number;
	income: number;
	items: (Item | null)[]; // todo: replace with map
	units: Unit[];
	bench: Array<{ index: number; unit: Unit | null }>;
};

export const makeForce = (id: string): Force => ({
	id,
	name: "",
	color: "",
	gold: 10,
	income: 5,
	units: [],
	bench: new Array(3).fill(null).map((_, index) => ({
		index,
		unit: null
	})),
	items: []
});

export const playerForce = makeForce(FORCE_ID_PLAYER);
export const cpuForce = makeForce(FORCE_ID_CPU);

export const updatePlayerGoldIO = (gold: number) => {

	playerForce.gold += Math.floor(gold);

	goldChangeAnimation(gold);

	scene.events.emit("gold-changed", playerForce.gold);
}
