/**
 * Session service — wraps core SessionManagement and SessionTransitions
 * for the Express API layer.
 */

import { v4 as uuid } from "uuid";
import * as SessionManagement from "@game/session/SessionManagement";
import * as SessionTransitions from "@game/session/SessionTransitions";
import type { SessionData } from "@game/types/session";
import type { Action, ActionResponse } from "@game/types/action";
import type { Unit } from "@game/types/unit";

/**
 * Create a new session.
 * Uses the server-generated seed for replay authority.
 */
export function createSession(
  playerId: string,
  crystalId?: string,
): SessionData {
  const seed = uuid();
  return SessionManagement.createInitialSession(playerId, seed, crystalId);
}

/**
 * Dispatch an action against a session, returning the updated session
 * and optionally a combat state when combat is triggered.
 *
 * Supports an optional enemy-team override for multiplayer matchmaking.
 */
export function handleAction(
  session: SessionData,
  action: Action,
  options?: { enemyTeam?: Unit[]; enemyPlayerName?: string },
): ActionResponse {
  return SessionTransitions.transitionToNextState(session, action, options);
}
