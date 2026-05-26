import { loadGame } from "@Game/effects/loadGame";

export async function resumeSinglePlayerGame() {

	// TODO: these io. functions can be moved into
	// the game controller
	io.FadeOut(500, 0x000);

	io.scene.children.removeAll();

	loadGame();

	io.screens.battleground();

	io.FadeIn(300);
}