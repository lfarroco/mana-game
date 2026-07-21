import { ClientState } from "@Models/ClientState";

export const startGame = (clientState: ClientState) => async () => {

	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	io.screens.crystalSelection(clientState);

	await io.FadeIn(300);
}
