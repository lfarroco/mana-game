import { images } from "../assets";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "../Scenes/Battleground/constants";
import { goldChangeAnimation, scene } from "../Scenes/Battleground/Systems/UIManager";
import { popText } from "../Systems/Chara/Animations/popText";
import { Unit } from "./Unit";

type Relic = {
	id: string,
	pic: string,
	events: { [key: string]: () => void }
	position: Point
}

export type Force = {
	id: string;
	name: string;
	color: string;
	gold: number;
	income: number;
	units: Unit[];
	relics: Relic[];
};

export const makeForce = (id: string): Force => {

	const relics: Relic[] = [
		{
			id: "training_room",
			pic: images.agility_training.key,
			events: {
				onBattleStart: () => {
					popText({
						text: "hello!",
						targetId: ""
					})
				}
			},
			position: {
				x: 1,
				y: 1
			}
		}
	];
	return {
		id,
		name: "",
		color: "",
		gold: 10,
		income: 5,
		units: [],
		relics
	}
};

export const playerForce = makeForce(FORCE_ID_PLAYER);
export const cpuForce = makeForce(FORCE_ID_CPU);

export const updatePlayerGoldIO = (gold: number) => {

	playerForce.gold += Math.floor(gold);

	goldChangeAnimation(gold);

	scene.events.emit("gold-changed", playerForce.gold);
}
