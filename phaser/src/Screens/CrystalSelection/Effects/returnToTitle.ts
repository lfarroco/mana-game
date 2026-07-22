import { env } from "@Env";
import * as TitleScreen from "../../Title/TitleScreen";

export const returnToTitle = async () => {
	await env.fadeOut(300, 0x000000);

	env.scene.children.each(c => c.destroy());
	env.scene.children.removeAll();
	env.scene.tweens.killAll();
	env.scene.time.removeAllEvents();

	TitleScreen.create();

	await env.fadeIn(300);
}
