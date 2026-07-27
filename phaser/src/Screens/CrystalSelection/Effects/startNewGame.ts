import * as parent from "../CrystalSelectionScreen";
import * as GameServer from "../../../GameServer";
import { env } from "@Env";
import { NavigationEvent } from "../../../Events";

export const startNewGame = async () => {
	const { currentIndex, crystals } = parent.state;
	const selectedCrystal = crystals[currentIndex];

	const server = GameServer.getServer();
	const session = await server.createSession(
		"local-player",
		selectedCrystal.id,
	);

	env.patchState({ session });

	await NavigationEvent.toBattleground.emit();
}
