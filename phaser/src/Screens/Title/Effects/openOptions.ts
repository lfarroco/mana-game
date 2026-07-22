import { env } from "@Env";
import * as OptionsScreen from "../../Options/OptionsScreen";

export const openOptions = () => async () => {
	await env.fadeOut(300, 0x000000);

	env.scene.children.removeAll();

	OptionsScreen.create();

	await env.fadeIn(300);
}
