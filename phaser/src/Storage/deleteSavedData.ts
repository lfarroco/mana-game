;
import * as GameServer from "../GameServer";
import { ClientState } from "@Models/ClientState";

const COMBAT_STORAGE_PREFIX = "mana_combat_";

export const deleteSavedData = (clientState: ClientState) => {
	const server = GameServer.getServer(clientState);

	if (clientState.session?.player_id && "sessionManager" in server) {
		// Delete the session from SessionManager (which also removes from localStorage)
		(
			server as unknown as { sessionManager: { deleteSession(id: string): void } }
		).sessionManager.deleteSession(clientState.session.player_id);

		// Also clean up persisted combat state
		localStorage.removeItem(COMBAT_STORAGE_PREFIX + clientState.session.player_id);

		console.debug("deleteSavedData", `[deleteSavedData] Session deleted for player: ${clientState.session.player_id}`);
	} else {
		console.warn("deleteSavedData", "[deleteSavedData] No session found to delete");
	}
};
