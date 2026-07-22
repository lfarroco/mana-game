import { env } from "../../../Env";

export const startGame = async () => {

	await io.FadeOut(300, 0x000000);

	env.scene.children.removeAll();

	io.screens.crystalSelection();

	await io.FadeIn(300);
}
