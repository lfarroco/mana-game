import { SCENE_KEYS } from "@Constants/constants";
import { getState, getCurrentScene } from "@Models/State";
import { getSavedData } from "./getSavedData";
import { setSeed } from "@Utils/Random";
import { getServerAdapter } from "@Core/ServerFactory";
import { SessionData } from "@Core/Types";

export function loadGame() {
	const data = getSavedData();
	if (!data) return;

	const savedData = JSON.parse(data);

	// Check if this is new SessionData format or old gameData format
	const isSessionData = savedData.player_id && savedData.phase;

	if (isSessionData) {
		// New format: SessionData
		const session = savedData as SessionData;

		// Restore session into SessionManager
		const server = getServerAdapter();
		if ('sessionManager' in server) {
			(server as any).sessionManager.updateSession(session.player_id, session);
		}

		// Set up game state
		setSeed(parseInt(session.seed));
		const state = getState();
		state.session = session;

		getCurrentScene().scene.start(SCENE_KEYS.BATTLEGROUND, { state: state });
	} else {
		console.warn("Legacy save format detected. Ignoring.");
		// TODO: Implement migration if needed, but for now assuming SessionData is the way forward.
		// If we really need redundancy check, this branch proves GameData is legacy.
	}
}
