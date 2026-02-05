import { storage } from "../../Storage";
import { getServerAdapter } from "@Core/ServerFactory";
import { getState } from "@Models/State";

export const deleteSavedData = () => {
	// Remove legacy "gameData" storage
	storage.removeItem("gameData");

	// Remove modern session data from SessionManager
	const server = getServerAdapter();
	const state = getState();

	if (state.session?.player_id && 'sessionManager' in server) {
		// Delete the session from SessionManager (which also removes from localStorage)
		(server as any).sessionManager.deleteSession(state.session.player_id);
		console.log(`[deleteSavedData] Session deleted for player: ${state.session.player_id}`);
	}

	console.log("[deleteSavedData] Saved game data deleted");
};
