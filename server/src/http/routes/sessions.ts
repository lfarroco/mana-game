/**
 * Session routes — session lifecycle and action dispatch.
 *
 * Player identity: `X-Player-Id` header (v1 — token auth comes later).
 * One active session per player; creating a second returns 409.
 *
 * The raw in-memory CombatState contains non-JSON-safe Maps, so responses
 * always strip it from the session payload. While in the `combat` phase it
 * is included separately, serialized via the core CombatCodec, so a
 * reconnecting client can resume playback.
 */

import { Router, type Request, type Response } from "express";
import * as CombatCodec from "@game/Combat/CombatCodec";
import type { SessionData } from "@game/types/session";
import type { CombatState } from "@game/types/combat";
import type { SessionRepo } from "../../persistence/repositories";
import { createSessionService } from "../../services/sessionService";
import {
  parseActionDispatchBody,
  parseCreateSessionBody,
  parsePlayerId,
} from "../../dto";

export function sessionsRouter(repo: SessionRepo): Router {
  const service = createSessionService(repo);
  const router = Router();

  // POST /sessions — create a new multiplayer session (409 if one exists)
  router.post("/", (req: Request, res: Response) => {
    const playerId = parsePlayerId(req.header("X-Player-Id"));
    const request = parseCreateSessionBody(req.body);
    const session = service.createSession(playerId, request);

    res.status(201).json(toWireSession(session));
  });

  // GET /sessions/current — resume/reconnect; combat state serialized while in combat
  router.get("/current", (req: Request, res: Response) => {
    const playerId = parsePlayerId(req.header("X-Player-Id"));
    const session = service.getSession(playerId);

    if (!session) {
      res.status(404).json({
        error: "no_active_session",
        message: "No active session",
      });
      return;
    }

    res.json(toWireSession(session));
  });

  // POST /sessions/current/actions — dispatch a single action
  router.post("/current/actions", (req: Request, res: Response) => {
    const playerId = parsePlayerId(req.header("X-Player-Id"));
    const { action } = parseActionDispatchBody(req.body);
    const result = service.handleAction(playerId, action);

    const response: Record<string, unknown> = {
      session: toWireSession(result.session),
    };
    if (result.combatState) {
      response.combatState = CombatCodec.serializeCombatState(
        result.combatState,
      );
    }

    res.json(response);
  });

  // DELETE /sessions/current — abandon the run
  router.delete("/current", (req: Request, res: Response) => {
    const playerId = parsePlayerId(req.header("X-Player-Id"));
    const deleted = service.deleteSession(playerId);

    if (!deleted) {
      res.status(404).json({
        error: "no_active_session",
        message: "No active session",
      });
      return;
    }

    res.status(204).send();
  });

  return router;
}

/**
 * Strip the raw (Map-carrying) CombatState from a session before responding.
 * While in the combat phase the combat state is included, serialized, so a
 * reconnecting client can resume playback.
 */
function toWireSession(session: SessionData): Record<string, unknown> {
  const { combatState, ...safe } = session as SessionData & {
    combatState?: CombatState;
  };

  if (session.phase === "combat" && combatState) {
    return {
      ...safe,
      combatState: CombatCodec.serializeCombatState(combatState),
    };
  }
  return safe;
}
