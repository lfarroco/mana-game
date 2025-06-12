import Phaser from "phaser";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "../../constants/constants";
import { Relic } from "../../Scenes/Battleground/Systems/Relic";
import { Unit } from "./Unit";
import { GameEvents } from "../../constants/events";

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
	return {
		id,
		name: "",
		color: "",
		gold: 10,
		income: 5,
		units: [],
		relics: []
	}
};

export const playerForce = makeForce(FORCE_ID_PLAYER);
export const cpuForce = makeForce(FORCE_ID_CPU);

export const updatePlayerGoldIO = (scene: Phaser.Scene, goldDelta: number) => {
	// Ensure goldDelta is an integer for consistent calculations
	const changeAmount = Math.floor(goldDelta);
	playerForce.gold += changeAmount;

	// Emit an event with the new total gold and the delta amount
	// The UIManager will listen to this to update text and play animations
	scene.events.emit(GameEvents.GOLD_CHANGED, playerForce.gold, changeAmount);
}
