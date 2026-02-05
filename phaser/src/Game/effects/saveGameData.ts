import { getState } from "@Models/State";
import { getServerAdapter } from "@Core/ServerFactory";

/**
 * Save game data through the SessionManager.
 * This is automatically called by server.handleAction(), but can be called
 * manually when needed (e.g., after direct session modifications).
 */
export function saveGameData() {
	const state = getState();
	const server = getServerAdapter();

	if (state.session?.player_id && 'sessionManager' in server) {
		(server as any).sessionManager.updateSession(state.session.player_id, state.session);
	} else {
		console.warn("[saveGameData] Unable to save: SessionManager not available or no player_id");
	}
}
