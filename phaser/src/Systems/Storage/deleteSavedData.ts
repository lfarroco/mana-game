import { env } from "@Env";
import * as GameServer from "../../GameServer";

export const deleteSavedData = async () => {
	const playerId = env.state.session?.player_id;
	if (!playerId) {
		console.warn("deleteSavedData", "[deleteSavedData] No session found to delete");
		return;
	}

	const server = GameServer.getServer();
	await server.deleteSession(playerId);

	console.debug("deleteSavedData", `[deleteSavedData] Session deleted for player: ${playerId}`);
};
