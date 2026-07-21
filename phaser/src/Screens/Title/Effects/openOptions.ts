import { ClientState } from "@Models/ClientState";

export const openOptions = (clientState: ClientState) => async () => {
	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	io.screens.options(clientState);

	io.FadeIn(300);
}
