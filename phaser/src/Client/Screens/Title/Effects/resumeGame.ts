import * as loadGame from "Client/Storage/loadGame"

export async function resumeGame() {

	io.FadeOut(500, 0x000);

	io.scene.children.removeAll();

	loadGame.loadGame();

	io.screens.battleground.create();

	io.FadeIn(300);
}