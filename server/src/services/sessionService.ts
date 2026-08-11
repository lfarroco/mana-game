/**
 * Session service — the server's application layer over core game logic.
 *
 * Wraps core SessionManagement / SessionTransitions for the Express API,
 * owns persistence via the SessionRepo, and enforces server-side rules:
 *   - one active session per player (409 on a second create),
 *   - actions rejected with 409 once a run reaches a terminal phase,
 *   - the server generates the session seed (it is the replay authority).
 */

import { v4 as uuid } from "uuid";
import * as SessionManagement from "@game/session/SessionManagement";
import * as SessionTransitions from "@game/session/SessionTransitions";
import type { SessionData } from "@game/types/session";
import type { Action, ActionResponse } from "@game/types/action";
import { ApiError } from "../errors";
import type { SessionRepo } from "../persistence/repositories";
import type { CreateSessionRequest } from "../dto";

/** Maximum entries kept in session.action_log. */
const MAX_ACTION_LOG_SIZE = 100;

export type SessionService = {
  createSession(playerId: string, request: CreateSessionRequest): SessionData;
  getSession(playerId: string): SessionData | null;
  handleAction(playerId: string, action: Action): ActionResponse;
  deleteSession(playerId: string): boolean;
};

export function createSessionService(repo: SessionRepo): SessionService {
  return {
    createSession(playerId, request) {
      const existing = repo.get(playerId);
      if (existing) {
        throw new ApiError(
          409,
          "session_already_exists",
          `Player '${playerId}' already has an active session (phase '${existing.phase}'). Abandon it first.`,
        );
      }

      // The server generates the seed — it is the replay authority.
      const seed = uuid();
      const session = SessionManagement.createInitialSession(
        playerId,
        seed,
        request.crystalId,
      );

      session.id = uuid();
      session.session_type = {
        type: "multiplayer",
        queueType: request.queueType ?? "casual",
      };

      repo.upsert(playerId, session);
      return session;
    },

    getSession(playerId) {
      return repo.get(playerId);
    },

    handleAction(playerId, action) {
      const session = repo.get(playerId);
      if (!session) {
        throw new ApiError(
          404,
          "no_active_session",
          `No active session for player '${playerId}'`,
        );
      }

      if (session.phase === "victory" || session.phase === "game_over") {
        throw new ApiError(
          409,
          "session_finished",
          `Session is already in terminal phase '${session.phase}'`,
        );
      }

      let result: ActionResponse;
      try {
        result = SessionTransitions.transitionToNextState(session, action);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Action rejected by game logic";
        throw new ApiError(422, "action_rejected", message);
      }

      // Record the action for audit/replay debugging (trimmed).
      const log = result.session.action_log ?? [];
      log.push({ action: action.type, timestamp: Date.now() });
      result.session.action_log = log.slice(-MAX_ACTION_LOG_SIZE);

      repo.upsert(playerId, result.session);
      return result;
    },

    deleteSession(playerId) {
      if (!repo.get(playerId)) return false;
      repo.delete(playerId);
      return true;
    },
  };
}
