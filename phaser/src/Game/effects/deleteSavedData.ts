import * as Logger from "@Utils/Logger";
import * as GameServer from "@Core/GameServer";

const logger = Logger.createLogger("deleteSavedData");

export const deleteSavedData = () => {
	const server = GameServer.getServer();

	if (state.session?.player_id && "sessionManager" in server) {
		// Delete the session from SessionManager (which also removes from localStorage)
		(
			server as unknown as { sessionManager: { deleteSession(id: string): void } }
		).sessionManager.deleteSession(state.session.player_id);
		logger.debug(`[deleteSavedData] Session deleted for player: ${state.session.player_id}`);
	} else {
		logger.warn("[deleteSavedData] No session found to delete");
	}
};
