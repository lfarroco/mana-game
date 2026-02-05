import { getServerAdapter } from "@Core/ServerFactory";
import { getState } from "@Models/State";

export const deleteSavedData = () => {
	const server = getServerAdapter();
	const state = getState();

	if (state.session?.player_id && 'sessionManager' in server) {
		// Delete the session from SessionManager (which also removes from localStorage)
		(server as any).sessionManager.deleteSession(state.session.player_id);
		console.log(`[deleteSavedData] Session deleted for player: ${state.session.player_id}`);
	} else {
		console.warn("[deleteSavedData] No session found to delete");
	}
};
