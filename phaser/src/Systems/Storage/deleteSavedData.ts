import { env } from "@Env";
import * as SessionManager from "../../SessionManager";

/**
 * Clear the persisted local save after a completed run.
 *
 * Single-player: removes the localStorage save so a finished run can't be
 * resumed from the title screen.
 *
 * Multiplayer: no-op — the server owns the session lifecycle. When a run
 * reaches a terminal phase (victory / game_over) the server already marked it
 * finished and no longer serves it (`GET /sessions/current` → 404); the
 * player can only create a new session. The client never deletes a server
 * session.
 */
export const deleteSavedData = async (): Promise<void> => {
	const session = env.state.session;
	if (!session?.player_id) {
		console.warn("deleteSavedData", "[deleteSavedData] No session found to delete");
		return;
	}

	if (session.session_type.type === "multiplayer") {
		console.debug(
			"deleteSavedData",
			"[deleteSavedData] Multiplayer session lifecycle is server-owned — nothing to delete"
		);
		return;
	}

	SessionManager.deleteSession(session.player_id);
	console.debug(
		"deleteSavedData",
		`[deleteSavedData] Session deleted for player: ${session.player_id}`
	);
};
