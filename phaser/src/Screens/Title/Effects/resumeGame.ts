import { ClientState } from "@Models/ClientState";
import * as loadGame from "../../../Storage/loadGame"

export const resumeGame = (clientState: ClientState) => async () => {

	io.FadeOut(500, 0x000);

	io.scene.children.removeAll();

	loadGame.loadGame(clientState);

	io.screens.battleground.create(clientState);

	io.FadeIn(300);
}