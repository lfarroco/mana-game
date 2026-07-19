import * as SessionManager from "@Core/SessionManager";
import * as Models from "@game/Models";
import * as SessionManagement from "./SessionManagement";
import * as SessionTransitions from "./SessionTransitions";

export async function createSession(
	playerId: string,
	crystalId: string,
): Promise<Models.SessionData> {
	const session = SessionManagement.createInitialSession(playerId, crystalId);
	session.id = `local-${playerId}-${Date.now()}`;
	SessionManager.updateSession(playerId, session);
	return session;
}

export async function handleAction(
	playerId: string,
	action: Models.Action
): Promise<Models.SessionData> {

	const result = SessionTransitions.transitionToNextState(
		state.session,
		action,
	);
	state.session = result;

	state.session.combatState = result.combatState;

	SessionManager.updateSession(playerId, result);

	return result;

}
