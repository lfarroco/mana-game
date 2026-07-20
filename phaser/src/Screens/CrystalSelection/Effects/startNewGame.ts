import * as parent from "../CrystalSelectionScreen";
import * as GameServer from "../../../GameServer";

export async function startNewGame() {
	const { currentIndex, crystals } = parent.state;
	const selectedCrystal = crystals[currentIndex];

	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	const server = GameServer.getServer();
	const session = await server.createSession(
		"local-player",
		selectedCrystal.id,
	);

	state.session = session;

	io.screens.battleground.create();

	await io.FadeIn(300);
}
