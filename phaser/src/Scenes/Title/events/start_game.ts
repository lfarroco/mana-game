import { SCENE_KEYS } from "@Constants/constants";
import { GameEvent } from "@Models/Entities/Entity";
import * as io from "@PhaserIO";

async function handler({ }) {
	await io.Fade(300, 0x000000)
	io.StartScene(SCENE_KEYS.BATTLEGROUND);
}

export default {
	key: 'events/start_game',
	handler
} as GameEvent<any>