import { env } from "../../../Env";
import * as TitleScreen from "../../Title/TitleScreen";

export const returnToTitle = async () => {

	await env.fadeOut(300, 0x000);

	env.scene.children.removeAll();

	TitleScreen.create();

	await env.fadeIn(300);
}
