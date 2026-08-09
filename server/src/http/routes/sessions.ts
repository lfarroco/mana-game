/**
 * Session routes — session lifecycle and action dispatch.
 *
 * Local-only (no auth): uses a single implicit player with one
 * active session at a time.  Identify via /sessions/current.
 */

import { Router, type Request, type Response } from "express";
import { v4 as uuid } from "uuid";
import type { SessionData } from "@game/types/session";
import * as CombatCodec from "@game/Combat/CombatCodec";
import * as sessionService from "../../services/sessionService";
import * as memory from "../../persistence/memory";

const LOCAL_PLAYER_ID = "local-player";

export const sessionsRouter = Router();

// POST /sessions — create a new session (replaces any existing)
sessionsRouter.post("/", (req: Request, res: Response) => {
  const { crystalId } = req.body as { crystalId?: string };

  const session = sessionService.createSession(LOCAL_PLAYER_ID, crystalId);
  session.id = uuid();

  memory.setCurrentSession(session);

  res.status(201).json(session);
});

// GET /sessions/current — get the active session
sessionsRouter.get("/current", (_req: Request, res: Response) => {
  const session = memory.getCurrentSession();

  if (!session) {
    res.status(404).json({ error: "No active session" });
    return;
  }

  // Strip raw combatState (contains non-JSON-safe Map)
  const { combatState: _, ...safeSession } = session as SessionData & {
    combatState?: unknown;
  };

  res.json(safeSession);
});

// POST /sessions/current/actions — dispatch an action
sessionsRouter.post("/current/actions", (req: Request, res: Response) => {
  const session = memory.getCurrentSession();

  if (!session) {
    res.status(404).json({ error: "No active session" });
    return;
  }

  const { action } = req.body as { action?: Record<string, unknown> };

  if (!action || typeof action !== "object") {
    res.status(400).json({ error: "Missing or invalid action" });
    return;
  }

  try {
    const result = sessionService.handleAction(session, action as never);
    memory.setCurrentSession(result.session);

    // Strip raw combatState from session (contains non-JSON-safe Map).
    // The serialized version is sent separately below.
    const { combatState: _rawCombat, ...safeSession } =
      result.session as SessionData & { combatState?: unknown };

    // Encode combat state for wire transport (removes non-JSON-safe Maps)
    const response: Record<string, unknown> = { session: safeSession };
    if (result.combatState) {
      response.combatState = CombatCodec.serializeCombatState(
        result.combatState,
      );
    }

    res.json(response);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Action dispatch failed";
    res.status(422).json({ error: message });
  }
});

// DELETE /sessions/current — abandon the current run
sessionsRouter.delete("/current", (_req: Request, res: Response) => {
  const session = memory.getCurrentSession();

  if (!session) {
    res.status(404).json({ error: "No active session" });
    return;
  }

  memory.clearCurrentSession();
  res.status(204).send();
});
