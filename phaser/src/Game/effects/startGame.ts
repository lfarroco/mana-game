import * as constants from "@Constants/constants";
import * as io from "@PhaserIO";

export async function startGame() {
	await io.Fade(300, 0x000000);
	io.StartScene(constants.SCENE_KEYS.BATTLEGROUND);
}
