import * as getSavedData from "@Storage/getSinglePlayerData";
import * as Models from "@game/Models";
import { env } from "@Env";

export function loadGame() {
	const data = getSavedData.getSinglePlayerData();
	if (!data) return;

	const savedData = JSON.parse(data) as Models.SessionData;

	env.state.session = savedData;

	// Restore combat state if present and session is in combat phase
	// (e.g., player quit mid-combat and is resuming)
	if (savedData.phase === "combat") {
		if (savedData.combatState) {
			// Reconstruct Map from serialized array
			const combatState = savedData.combatState;
			if (Array.isArray(combatState.unitById)) {
				combatState.unitById = new Map(combatState.unitById as unknown as [string, Models.Unit][]);
			}
			env.state.combatState = combatState;
		} else {
			// Session says combat but no combat state — re-simulate as a safety net
			console.warn("loadGame", "Session in combat phase but no combatState found; will re-simulate on phase entry");
		}
	}
}
