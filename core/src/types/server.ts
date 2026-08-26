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
  /**
   * Create a new session.
   *
   * `seed` is optional and only honored by local single-player servers —
   * the multiplayer server generates the seed itself (it is the replay
   * authority) and ignores any client-supplied value.
   */
  createSession(playerId: string, crystalId: string, seed?: string): Promise<SessionData>;
  handleAction(playerId: string, action: Action): Promise<ActionResponse>;
};
