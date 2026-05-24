import { getSavedData } from "@Game/effects/getSavedData";
import { setSeed } from "@Utils/Random";
import { getServerAdapter } from "@Core/ServerFactory";
import { SessionData } from "@Core/Types";
import { stringToSeed } from "@Core/Seeding";

export function loadGame() {
	const data = getSavedData();
	if (!data) return;

	const savedData = JSON.parse(data) as SessionData;

	// Restore session into SessionManager
	const server = getServerAdapter();
	if ("sessionManager" in server) {
		(
			server as unknown as {
				sessionManager: { updateSession(id: string, session: SessionData): void };
			}
		).sessionManager.updateSession(savedData.player_id, savedData);
	}

	// Set up game state
	setSeed(stringToSeed(savedData.seed));
	state.session = savedData;

	//getCurrentScene().scene.start(SCENE_KEYS.BATTLEGROUND, { state: state });
}
