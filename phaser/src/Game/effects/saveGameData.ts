import { storage } from "../../Storage";
import { getState } from "@Models/State";

export function saveGameData() {
	const { session } = getState();
	// session.seed = getSeed().toString(); // Session seed should drive the RNG, not the other way around usually. 
	// But if we want to persist current RNG state:
	// storage.setItem("gameData", JSON.stringify(session));

	// Actually, let's just save the session.
	// If the random seed global was updated, we might want to update session.seed?
	// In State.ts: setSeed(parseInt(state.currentState.session.seed));

	storage.setItem("gameData", JSON.stringify(session));
}
