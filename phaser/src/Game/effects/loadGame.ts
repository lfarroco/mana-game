import * as getSavedData from "@Game/effects/getSavedData";
import * as Random from "@Utils/Random";
import * as Types from "@Core/Types";
import * as Seeding from "@Core/Seeding";
import * as GameServer from "@Core/GameServer";

export function loadGame() {
	const data = getSavedData.getSavedData();
	if (!data) return;

	const savedData = JSON.parse(data) as Types.SessionData;

	// Restore session into SessionManager
	const server = GameServer.getServer();
	if ("sessionManager" in server) {
		(
			server as unknown as {
				sessionManager: { updateSession(id: string, session: Types.SessionData): void };
			}
		).sessionManager.updateSession(savedData.player_id, savedData);
	}

	// Set up game state
	Random.setSeed(Seeding.stringToSeed(savedData.seed));
	state.session = savedData;

	//getCurrentScene().scene.start(SCENE_KEYS.BATTLEGROUND, { state: state });
}
