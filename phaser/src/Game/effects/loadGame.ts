import { SCENE_KEYS } from "@Constants/constants";
import { getState, getCurrentScene } from "@Models/State";
import { getSavedData } from "./getSavedData";

import { setSeed } from "@Utils/Random";

export function loadGame() {
	const data = getSavedData();
	if (!data) return;
	const gameData = JSON.parse(data);

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
