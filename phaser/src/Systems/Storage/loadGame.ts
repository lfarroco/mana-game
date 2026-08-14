import * as getSavedData from "@Systems/Storage/getSinglePlayerData";
import { env } from "@Env";

export function loadGame() {
	const session = getSavedData.getSinglePlayerData();
	if (!session) return;

	if (session.phase === "combat" && session.combatState) {
		env.patchState({ session, combatState: session.combatState });
	} else {
		env.patchState({ session });
	}
}
