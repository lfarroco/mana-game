import * as parent from "../CrystalSelectionScreen";
import * as GameServer from "../../../GameServer";
import { env } from "../../../Env";

export const startNewGame = async () => {
	const { currentIndex, crystals } = parent.state;
	const selectedCrystal = crystals[currentIndex];

	await io.FadeOut(300, 0x000000);

	env.scene.children.removeAll();

	const server = GameServer.getServer();
	const session = await server.createSession(
		"local-player",
		selectedCrystal.id,
	);

	env.state.session = session;

	io.screens.battleground.create();

	await io.FadeIn(300);
}
