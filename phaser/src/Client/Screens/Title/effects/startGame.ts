import * as io from "@PhaserIO";
import { renderCrystalSelectionScreen } from "Client/Screens/CrystalSelection/CrystalSelectionScene";

export async function startGame({ isMultiplayer }: { isMultiplayer: boolean; }) {

	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	renderCrystalSelectionScreen(isMultiplayer)

	await io.FadeIn(300);
}
