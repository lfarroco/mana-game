import * as loadGame from "@Game/effects/loadGame";

export async function resumeGame() {

	io.FadeOut(500, 0x000);

	io.scene.children.removeAll();

	loadGame.loadGame();

	io.screens.battleground();

	io.FadeIn(300);
}