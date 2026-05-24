import { getState } from "@Models/State";
import { getServerAdapter } from "@Core/GameServer";
import { createLogger } from "@Utils/Logger";
import { SessionData } from "@Core/Types";

const logger = createLogger("saveGameData");

/**
 * Save game data through the SessionManager.
 * This is automatically called by server.handleAction(), but can be called
 * manually when needed (e.g., after direct session modifications).
 */
export function saveGameData() {
	const state = getState();
	const server = getServerAdapter();

	if (state.session?.player_id && "sessionManager" in server) {
		(
			server as unknown as {
				sessionManager: { updateSession(id: string, session: SessionData): void };
			}
		).sessionManager.updateSession(state.session.player_id, state.session);
	} else {
		logger.warn("[saveGameData] Unable to save: SessionManager not available or no player_id");
	}
}
