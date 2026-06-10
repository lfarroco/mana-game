import * as State from "@Models/State";
import * as Logger from "@Utils/Logger";
import * as Types from "@Core/Types";
import * as GameServer from "@Core/GameServer"

const logger = Logger.createLogger("saveGameData");

/**
 * Save game data through the SessionManager.
 * This is automatically called by server.handleAction(), but can be called
 * manually when needed (e.g., after direct session modifications).
 */
export function saveGameData() {
	const state = State.getState();
	const server = GameServer.getServer();

	if (state.session?.player_id && "sessionManager" in server) {
		(
			server as unknown as {
				sessionManager: { updateSession(id: string, session: Types.SessionData): void };
			}
		).sessionManager.updateSession(state.session.player_id, state.session);
	} else {
		logger.warn("[saveGameData] Unable to save: SessionManager not available or no player_id");
	}
}
