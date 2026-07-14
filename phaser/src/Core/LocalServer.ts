import * as SessionManager from "@Core/SessionManager";
import * as GameLogic from "@Core/GameLogic";
import * as Models from "@Core/Models";

export async function createSession(
	playerId: string,
	crystalId: string,
): Promise<Models.SessionData> {
	const session = GameLogic.createInitialSession(playerId, crystalId);
	session.id = `local-${playerId}-${Date.now()}`;
	SessionManager.updateSession(playerId, session);
	return session;
}

export async function handleAction(
	playerId: string,
	action: Models.Action
): Promise<Models.SessionData> {

	const result = GameLogic.transitionToNextState(
		state.session,
		action,
	);
	state.session = result;

	state.session.combatState = result.combatState;



	SessionManager.updateSession(playerId, result);

	return result;

}
