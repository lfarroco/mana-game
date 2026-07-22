import { env } from "../../../Env";

export const returnToTitle = async () => {

	await io.FadeOut(300, 0x000);

	env.scene.children.removeAll();

	io.screens.title.create();

	await io.FadeIn(300);
}
