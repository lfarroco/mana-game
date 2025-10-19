import { GameEvent } from "@Models/Entities/Entity";
import { Fade, StartScene } from "@PhaserIO";
import TitleSceneSpec from "@Scenes/Title/TitleScene.spec";

async function handler({ }) {

	await Fade(500, 0x000000)

	StartScene(TitleSceneSpec.name);
}

export default {
	key: 'events/return_to_title',
	handler
} as GameEvent<{}>

