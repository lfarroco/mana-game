import { env } from "../../../Env";
import * as loadGame from "../../../Storage/loadGame"

export const resumeGame = async () => {

	io.FadeOut(500, 0x000);

	env.scene.children.removeAll();

	loadGame.loadGame();

	io.screens.battleground.create();

	io.FadeIn(300);
}