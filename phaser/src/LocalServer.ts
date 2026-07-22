import * as SessionManager from "./SessionManager";
import * as Models from "@game/Models";
import * as SessionTransitions from "@game/SessionTransitions";
import { env } from "./Env";

const COMBAT_STORAGE_PREFIX = "mana_combat_";

export async function createSession(
	playerId: string,
	crystalId: string,
): Promise<Models.SessionData> {
	const session = SessionManager.createSession(playerId, crystalId);
	session.id = `local-${playerId}-${Date.now()}`;
	SessionManager.updateSession(playerId, session);
	return session;
}

export async function handleAction(
	playerId: string,
	action: Models.Action
): Promise<Models.ActionResponse> {

	const result = SessionTransitions.transitionToNextState(
		env.state.session,
		action,
	);
	env.state.session = result.session;

	SessionManager.updateSession(playerId, result.session);

	// Persist or clean up combat state so mid-combat progress survives restarts
	if (result.combatState) {
		// Convert Maps to arrays for JSON serialization (Maps don't serialize natively)
		const serializable = {
			...result.combatState,
			unitById: Array.from(result.combatState.unitById.entries()),
		};
		localStorage.setItem(
			COMBAT_STORAGE_PREFIX + playerId,
			JSON.stringify(serializable),
		);
		console.debug("LocalServer", `Combat state persisted to localStorage (${COMBAT_STORAGE_PREFIX}${playerId})`);
	} else {
		localStorage.removeItem(COMBAT_STORAGE_PREFIX + playerId);
	}

	return result;

}
