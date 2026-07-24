/**
 * Game server interface — implemented by both LocalServer and RemoteServer.
 *
 * Note: createSession is intentionally separate from handleAction because
 * session creation requires a crystalId that isn't part of the action union.
 * If crystal selection is folded into a first-class action in the future,
 * createSession can be replaced by handleAction("create_session", { crystalId }).
 */

import type { Action, ActionResponse } from "./action";
import type { SessionData } from "./session";

export type GameServer = {
	createSession(playerId: string, crystalId: string): Promise<SessionData>;
	handleAction(playerId: string, action: Action): Promise<ActionResponse>;
};