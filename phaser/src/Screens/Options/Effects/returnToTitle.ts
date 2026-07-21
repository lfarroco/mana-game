import { ClientState } from "@Models/ClientState";

export const returnToTitle = (clientState: ClientState) => async () => {

	await io.FadeOut(300, 0x000);

	io.scene.children.removeAll();

	io.screens.title.create(clientState);

	await io.FadeIn(300);
}
