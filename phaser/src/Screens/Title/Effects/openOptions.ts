import { env } from "../../../Env";

export const openOptions = () => async () => {
	await io.FadeOut(300, 0x000000);

	env.scene.children.removeAll();

	io.screens.options();

	io.FadeIn(300);
}
