import * as io from "@PhaserIO";
import { renderCrystalSelectionScreen } from "Client/Scenes/CrystalSelection/CrystalSelectionScene";

export async function startGame(isMultiplayer: boolean) {

	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	renderCrystalSelectionScreen(isMultiplayer)

	await io.FadeIn(300);
}
