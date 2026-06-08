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
	action: Types.Action
): Promise<Types.SessionData> {

	const result = GameLogic.transitionToNextState(
		state.session,
		action,
	);
	state.session = result;

	state.session.combatState = result.combatState;

	io.scene.events.emit("sessionUpdated", {
		action,
		session: result,
	})

	SessionManager.updateSession(playerId, result);

	return result;

}
