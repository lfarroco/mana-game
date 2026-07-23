/**
 * Game server interface — implemented by both LocalServer and RemoteServer.
 */

import type { Action, ActionResponse } from "./action";
import type { SessionData } from "./session";

// FIXME: createSession could be replaced by handleAction("create_session", { crystalId })
// to have a single unified action dispatch path.
export type GameServer = {
	createSession(playerId: string, crystalId: string): Promise<SessionData>;
	handleAction(playerId: string, action: Action): Promise<ActionResponse>;
};