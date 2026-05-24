import * as _ from "../CrystalSelectionScene";
import * as GameServer from "@Core/GameServer";

export async function startNewGame() {
	const selectedCrystal = _.state.crystals[_.state.currentIndex];

	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	const server = GameServer.getServer();
	const session = await server.createSession(
		"local-player",
		selectedCrystal.id,
	);

	state.session = session;

	io.screens.battleground();

	await io.FadeIn(300);
}
