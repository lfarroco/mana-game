import { SCENE_KEYS } from "@Constants/constants";
import { getState, getCurrentScene } from "@Models/State";
import { getSavedData } from "./getSavedData";
import { setSeed } from "@Utils/Random";
import { getServerAdapter } from "@Core/ServerFactory";
import { SessionData } from "@Core/Types";

export function loadGame() {
	const data = getSavedData();
	if (!data) return;

	const savedData = JSON.parse(data) as SessionData;

	// Restore session into SessionManager
	const server = getServerAdapter();
	if ('sessionManager' in server) {
		(server as any).sessionManager.updateSession(savedData.player_id, savedData);
	}

	// Set up game state
	setSeed(parseInt(savedData.seed));
	const state = getState();
	state.session = savedData;

	getCurrentScene().scene.start(SCENE_KEYS.BATTLEGROUND, { state: state });
}
