import { SCENE_KEYS } from "@Constants/constants";
import { getState, getCurrentScene } from "@Models/State";
import { getSavedData } from "./getSavedData";
import { setSeed } from "@Utils/Random";
import { getServerAdapter } from "@Core/ServerFactory";

export function loadGame() {
	const data = getSavedData();
	if (!data) return;

	const savedData = JSON.parse(data);

	// Check if this is new SessionData format or old gameData format
	const isSessionData = savedData.player_id && savedData.phase;

	if (isSessionData) {
		// New format: SessionData
		const session = savedData;

		// Restore session into SessionManager
		const server = getServerAdapter();
		if ('sessionManager' in server) {
			(server as any).sessionManager.updateSession(session.player_id, session);
		}

		// Set up game state
		setSeed(session.seed);
		const state = getState();
		state.gameData.playerId = session.player_id;

		// Convert session to gameData format for BattlegroundScene
		state.gameData = {
			player: {
				id: 'PLAYER',
				name: '',
				color: '',
				units: session.team?.units || [],
				wins: session.wins,
				losses: session.losses,
				lives: 4 - session.losses, // Convert losses back to lives
			},
			round: session.round,
			hour: session.step,
			seed: session.seed,
			initialSeed: session.initial_seed,
			playerId: session.player_id,
			recentEncounterIds: session.encounter_history,
			runStats: session.runStats,
			isSeeded: false,
		};

		getCurrentScene().scene.start(SCENE_KEYS.BATTLEGROUND, state.gameData);
	} else {
		// Old format: legacy gameData
		const gameData = savedData;

		// Handle legacy saves or missing seed
		if (!gameData.seed) {
			const newSeed = Date.now();
			gameData.seed = newSeed;
			gameData.initialSeed = newSeed;
		}

		getState().gameData = gameData;
		setSeed(gameData.seed);
		getCurrentScene().scene.start(SCENE_KEYS.BATTLEGROUND, gameData);
	}
}
