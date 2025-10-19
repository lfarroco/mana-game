import { GameEvent } from "@Models/Entities/Entity";
import { getState } from "@Models/State";
import audio from "../entities/tabs/audio"

async function handler(tab: string) {

	const scene = getState().currentScene;

	const container = scene.data.get("options/tab_controls")

	console.log("will render", tab, "on", container)

	if (tab === "audio") {
		audio.create();
	}

}

export default {
	key: 'events/render_tab',
	handler
} as GameEvent<string>

