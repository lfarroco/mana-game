/**
 * Session routes — session lifecycle and action dispatch.
 *
 * Player identity: `req.playerId`, attached by the bearer auth middleware
 * (`requireAuth`). One active session per player; creating a second returns
 * 409 while the current run is still active.
 *
 * Session lifecycle is entirely server-owned — there is no client-delete
 * endpoint. A run finishes when core transitions it to a terminal phase
 * (`victory` / `game_over`); the terminal session is returned once in the
 * action response, and from then on `GET /sessions/current` returns 404
 * (finished sessions are not served) while `POST /sessions` succeeds again
 * (a finished run does not block a new one).
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
  IdempotencyRepo,
  PlayerRepo,
  PlayerStatsRepo,
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
  playerStatsRepo: PlayerStatsRepo;
  idempotencyRepo: IdempotencyRepo;
};

export function sessionsRouter(deps: SessionRouterDeps): Router {
  const service = createSessionService(deps.repo, {
    ghostRepo: deps.ghostRepo,
    ratingRepo: deps.ratingRepo,
    playerRepo: deps.playerRepo,
    playerStatsRepo: deps.playerStatsRepo,
    idempotencyRepo: deps.idempotencyRepo,
  });
  const router = Router();

  // POST /sessions — create a new multiplayer session (409 if one exists)
  router.post("/", async (req: Request, res: Response) => {
    const playerId = getPlayerId(req);
    const request = parseCreateSessionBody(req.body);
    const session = await service.createSession(playerId, request);

    res.status(201).json(toWireSession(session));
  });

  // GET /sessions/current — resume/reconnect; combat state serialized while in
  // combat. Finished (terminal-phase) runs are intentionally not served: the
  // service returns null for them, so this 404s with `no_active_session` and
  // the player can only create a new session.
  router.get("/current", async (req: Request, res: Response) => {
    const playerId = getPlayerId(req);
    const session = await service.getSession(playerId);

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
  router.post("/current/actions", async (req: Request, res: Response) => {
    const playerId = getPlayerId(req);
    const { action, clientActionId } = parseActionDispatchBody(req.body);
    const result = await service.handleAction(playerId, action, clientActionId);

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
