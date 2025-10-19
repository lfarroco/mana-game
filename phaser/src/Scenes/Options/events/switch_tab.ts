import { GameEvent } from "@Models/Entities/Entity";
import { getState } from "@Models/State";
import { OptionsSceneState } from "../OptionsScene.spec";

async function handler(tab: "audio" | "graphics" | "game") {
	//@ts-ignore
	const state = getState().currentScene.state as OptionsSceneState;
	state.currentTab = tab;

}

export default {
	key: 'events/switch_tab',
	handler
} as GameEvent<string>

