import { env } from "@Env";
import * as CrystalSelectionScreen from "../../CrystalSelection/CrystalSelectionScreen";

export const startGame = async () => {

	await env.fadeOut(300, 0x000000);

	env.scene.children.removeAll();

	CrystalSelectionScreen.create();

	await env.fadeIn(300);
}
