
// Interrupt System
// This system is responsible for handling the battle interrupt mechanic in the game.

import { signals, listeners } from "../../../Models/Signals";
import { delay } from "../../../Utils/animation";
import BattlegroundScene from "../BattlegroundScene";
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants";
import * as Choice from "./Choice";
import * as UIManager from "./UIManager";

type InterruptState = {
	interrupt: boolean,
	interruptBtn: Phaser.GameObjects.Container | null
}

let scene: BattlegroundScene;
export let state: InterruptState = {
	interrupt: false,
	interruptBtn: null
}

const displayInterruptBtn = () => {
	state.interruptBtn = UIManager.createButton(
		"Interrupt",
		SCREEN_WIDTH - 180, SCREEN_HEIGHT - 60,
		async () => {
			state.interrupt = true;
			hideInterruptBtn();
		});
}

const hideInterruptBtn = () => {
	state.interruptBtn?.destroy();
	state.interruptBtn = null;
}

export const getInterruptAction = async () => {

	const choice = await new Promise<{
		pic: string,
		title: string,
		desc: string
	}>((resolve) =>
		Choice.displayChoices(scene)(resolve)([
			{ title: "Advance", pic: "cards/advance", desc: "Advance to the next wave" },
			{ title: "Explore", pic: "cards/explore", desc: "Explore the area for loot" },
			{ title: "Merchant", pic: "cards/merchant", desc: "Visit the merchant to buy items" },
			{ title: "Rest", pic: "cards/rest", desc: "Rest and recover" },
		])
	);

	console.log("interrupt...", choice)
	await delay(scene, 1000 / scene.speed);

	return choice;
}

export const init = (sceneRef: BattlegroundScene) => {

	scene = sceneRef;

	listeners([
		[signals.WAVE_START, () => {
			displayInterruptBtn();
		}],
		[signals.WAVE_FINISHED, () => {
			hideInterruptBtn();
		}],
	]);
}
