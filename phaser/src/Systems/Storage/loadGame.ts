import * as getSavedData from "@Systems/Storage/getSinglePlayerData";
import * as Models from "@game/Models";
import { env } from "@Env";

export function loadGame() {
	const data = getSavedData.getSinglePlayerData();
	if (!data) return;

	const savedData = JSON.parse(data) as Models.SessionData;

	// Restore combat state if present and session is in combat phase
	// (e.g., player quit mid-combat and is resuming)
	if (savedData.phase === "combat") {
		// Reconstruct Map from serialized array
		const combatState = savedData.combatState!;
		combatState.unitById = new Map(combatState.unitById as unknown as [string, Models.Unit][]);
		env.patchState({ session: savedData, combatState });

	} else {
		env.patchState({ session: savedData });
	}
}
