import * as SessionManager from "@Core/SessionManager";
import * as GameLogic from "@Core/GameLogic";
import * as Types from "@Core/Types";


export async function createSession(
	playerId: string,
	crystalId: string,
): Promise<Types.SessionData> {
	const session = GameLogic.createInitialSession(playerId, crystalId);
	session.id = `local-${playerId}-${Date.now()}`;
	SessionManager.updateSession(playerId, session);
	return session;
}

export async function handleAction(
	playerId: string,
	actionId: string,
	payload?: Types.ActionPayload
): Promise<Types.SessionData> {

	const result = GameLogic.transitionToNextState(
		state.session,
		actionId,
		payload,
	);
	state.session = result.session;

	state.session.combatState = result.combatState;

	io.scene.events.emit("sessionUpdated", {
		actionId,
		session: result.session,
	})

	SessionManager.updateSession(playerId, result.session);

	return result.session;

}
