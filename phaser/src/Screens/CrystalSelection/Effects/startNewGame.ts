import { getSelection } from "../CrystalSelectionScreen";
import * as GameServer from "../../../GameServer";
import { env } from "@Env";
import { NavigationEvent } from "../../../Events";
import { LOCAL_PLAYER_ID } from "../../../SessionManager";

export const startNewGame = async () => {
	const { crystals, currentIndex } = getSelection();
	const selectedCrystal = crystals[currentIndex];

	const server = GameServer.getServer();
	const session = await server.createSession(
		LOCAL_PLAYER_ID,
		selectedCrystal.id,
	);

	env.patchState({ session });

	await NavigationEvent.toBattleground.emit();
}

