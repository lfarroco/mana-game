import * as getSavedData from "@Game/effects/getSinglePlayerData";
import * as Random from "@game/Random";
import * as Models from "@Core/Models";
import * as Seeding from "@game/Seeding";

export function loadGame() {
	const data = getSavedData.getSinglePlayerData();
	if (!data) return;

	const savedData = JSON.parse(data) as Models.SessionData;

	// Set up game state
	// TODO: this is needed? review random system
	Random.setSeed(Seeding.stringToSeed(savedData.seed));

	state.session = savedData;

}
