/**
 * Session routes — session lifecycle and action dispatch.
 *
 * Player identity: `req.playerId`, attached by the bearer auth middleware
 * (`requireAuth`). One active session per player; creating a second returns
 * 409.
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
import type {
  GhostRepo,
  PlayerRepo,
  RatingRepo,
  SessionRepo,
} from "../../persistence/repositories";
import { createSessionService } from "../../services/sessionService";
import { parseActionDispatchBody, parseCreateSessionBody } from "../../dto";
import { ApiError } from "../../errors";

export type SessionRouterDeps = {
  repo: SessionRepo;
  ghostRepo: GhostRepo;
  ratingRepo: RatingRepo;
  playerRepo: PlayerRepo;
};

export function sessionsRouter(deps: SessionRouterDeps): Router {
  const service = createSessionService(deps.repo, {
    ghostRepo: deps.ghostRepo,
    ratingRepo: deps.ratingRepo,
    playerRepo: deps.playerRepo,
  });
  const router = Router();

  // POST /sessions — create a new multiplayer session (409 if one exists)
  router.post("/", (req: Request, res: Response) => {
    const playerId = getPlayerId(req);
    const request = parseCreateSessionBody(req.body);
    const session = service.createSession(playerId, request);

    res.status(201).json(toWireSession(session));
  });

  // GET /sessions/current — resume/reconnect; combat state serialized while in combat
  router.get("/current", (req: Request, res: Response) => {
    const playerId = getPlayerId(req);
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
    const playerId = getPlayerId(req);
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
    const playerId = getPlayerId(req);
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
 * The requireAuth middleware guarantees `req.playerId` on mounted routes.
 * This is a defensive guard (and keeps TS happy) — it should never fire.
 */
function getPlayerId(req: Request): string {
  if (!req.playerId) {
    throw new ApiError(401, "missing_token", "Missing player identity");
  }
  return req.playerId;
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
