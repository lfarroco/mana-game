import * as getSavedData from "Client/Storage/getSinglePlayerData";
import * as Random from "@game/Random";
import * as Models from "@game/Models";
import * as Seeding from "@game/Seeding";

const COMBAT_STORAGE_PREFIX = "mana_combat_";

export function loadGame() {
	const data = getSavedData.getSinglePlayerData();
	if (!data) return;

	const savedData = JSON.parse(data) as Models.SessionData;

	// Set up game state
	// TODO: this is needed? review random system
	Random.setSeed(Seeding.stringToSeed(savedData.seed));

	state.session = savedData;

	// Restore combat state if present and session is in combat phase
	// (e.g., player quit mid-combat and is resuming)
	if (savedData.phase === "combat") {
		const combatData = localStorage.getItem(COMBAT_STORAGE_PREFIX + savedData.player_id);
		if (combatData) {
			try {
				const raw = JSON.parse(combatData);
				// Reconstruct Map from serialized array
				if (Array.isArray(raw.unitById)) {
					raw.unitById = new Map(raw.unitById);
				}
				state.combatState = raw as Models.CombatState;
			} catch {
				localStorage.removeItem(COMBAT_STORAGE_PREFIX + savedData.player_id);
			}
		}

		// If still no combatState, the persisted data was corrupted or from an old version.
		// Re-simulate the combat locally as a fallback so the game doesn't crash.
		if (!state.combatState) {
			console.warn("loadGame", "Session in combat phase but no valid combatState found; will re-simulate on phase entry");
		}
	}
}
