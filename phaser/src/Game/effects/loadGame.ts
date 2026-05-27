import * as getSavedData from "@Game/effects/getSinglePlayerData";
import * as Random from "@Utils/Random";
import * as Types from "@Core/Types";
import * as Seeding from "@Core/Seeding";

export function loadGame() {
	const data = getSavedData.getSinglePlayerData();
	if (!data) return;

	const savedData = JSON.parse(data) as Types.SessionData;

	// Set up game state
	// TODO: this is needed? review random system
	Random.setSeed(Seeding.stringToSeed(savedData.seed));

	state.session = savedData;

}
