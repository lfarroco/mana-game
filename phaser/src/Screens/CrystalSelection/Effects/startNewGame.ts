import * as parent from "../CrystalSelectionScreen";
import * as GameServer from "../../../GameServer";
import { ClientState } from "@Models/ClientState";

export const startNewGame = (clientState: ClientState) => async () => {
	const { currentIndex, crystals } = parent.state;
	const selectedCrystal = crystals[currentIndex];

	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	const server = GameServer.getServer(clientState);
	const session = await server.createSession(
		clientState,
		"local-player",
		selectedCrystal.id,
	);

	clientState.session = session;

	io.screens.battleground.create(clientState);

	await io.FadeIn(300);
}
