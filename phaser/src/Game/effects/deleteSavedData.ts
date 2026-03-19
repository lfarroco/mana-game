import { getServerAdapter } from "@Core/ServerFactory";
import { getState } from "@Models/State";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("deleteSavedData");

export const deleteSavedData = () => {
	const server = getServerAdapter();
	const state = getState();

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
