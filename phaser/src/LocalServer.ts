import * as SessionManager from "./SessionManager";
import * as Models from "@game/Models";
import * as SessionTransitions from "@game/SessionTransitions";
import { env } from "@Env";

export async function createSession(
	playerId: string,
	crystalId: string
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
	const result = SessionTransitions.transitionToNextState(env.state.session, action);
	env.updateState({ ...env.state, session: result.session });

	SessionManager.updateSession(playerId, result.session);

	return result;
}

export function deleteSession(playerId: string): void {
	SessionManager.deleteSession(playerId);
}
