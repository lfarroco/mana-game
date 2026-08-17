import { getSelection } from "../CrystalSelectionScreen";
import * as GameServer from "../../../GameServer";
import { remoteServer } from "../../../RemoteServer";
import { env } from "@Env";
import { getScreenManager } from "../../ScreenManager";
import { LOCAL_PLAYER_ID } from "../../../SessionManager";
import { isMultiplayerMode } from "@lib/multiplayerMode";

export const startNewGame = async () => {
	const { crystals, currentIndex } = getSelection();
	const selectedCrystal = crystals[currentIndex];

	// Multiplayer mode (arena entry): the server generates the seed and owns
	// the session; single-player keeps the in-process LocalServer.
	const server = isMultiplayerMode() ? remoteServer : GameServer.getServer();
	const session = await server.createSession(LOCAL_PLAYER_ID, selectedCrystal.id);

	env.patchState({ session });

	await getScreenManager().go("battleground", { crystalId: selectedCrystal.id });
};
