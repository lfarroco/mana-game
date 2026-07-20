;
import * as GameServer from "../GameServer";

const COMBAT_STORAGE_PREFIX = "mana_combat_";

export const deleteSavedData = () => {
	const server = GameServer.getServer();

	if (state.session?.player_id && "sessionManager" in server) {
		// Delete the session from SessionManager (which also removes from localStorage)
		(
			server as unknown as { sessionManager: { deleteSession(id: string): void } }
		).sessionManager.deleteSession(state.session.player_id);

		// Also clean up persisted combat state
		localStorage.removeItem(COMBAT_STORAGE_PREFIX + state.session.player_id);

		console.debug("deleteSavedData", `[deleteSavedData] Session deleted for player: ${state.session.player_id}`);
	} else {
		console.warn("deleteSavedData", "[deleteSavedData] No session found to delete");
	}
};
