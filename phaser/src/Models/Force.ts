import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "../Scenes/Battleground/constants";
import { goldChangeAnimation, scene, updateUI } from "../Scenes/Battleground/Systems/UIManager";
import { Item } from "./Item";
import { Unit } from "./Unit";

export type Force = {
	id: string;
	name: string;
	color: string;
	gold: number;
	income: number;
	items: (Item | null)[]; // todo: replace with map
	units: Unit[]
	bench: Unit[];
};

export const makeForce = (id: string): Force => ({
	id,
	name: "",
	color: "",
	gold: 10,
	income: 5,
	units: [],
	bench: [],
	items: []
});

export const playerForce = makeForce(FORCE_ID_PLAYER);
export const cpuForce = makeForce(FORCE_ID_CPU);

export const updatePlayerGoldIO = (gold: number) => {

	playerForce.gold += Math.floor(gold);
	updateUI();
	goldChangeAnimation(gold);

	scene.events.emit("gold-changed", playerForce.gold);

}
