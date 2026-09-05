/**
 * Player routes — the authenticated profile endpoint for the multiplayer lobby
 * (`GET /api/v1/players/me`) plus the display-name change
 * (`PATCH /api/v1/players/me`).
 *
 * GET returns everything the lobby needs in one request: identity (display
 * name, provider), the current rating, career + season victory counts, rename
 * availability, and whether an active (resumable) run exists. PATCH sets a
 * new display name (validated, 30-day cooldown) and returns the refreshed
 * profile. Identity comes from `req.playerId`, which the bearer-auth
 * middleware (`requireAuth`) guarantees on mounted routes.
 */

import { Router, type Request, type Response } from "express";
import { ApiError } from "../../errors";
import { parseUpdateDisplayNameBody } from "../../dto";
import {
  getPlayerProfile,
  updateDisplayName,
} from "../../services/playerService";
import type {
  PlayerRepo,
  PlayerStatsRepo,
  RatingRepo,
  SessionRepo,
} from "../../persistence/repositories";

export type PlayersRouterDeps = {
  playerRepo: PlayerRepo;
  ratingRepo: RatingRepo;
  playerStatsRepo: PlayerStatsRepo;
  sessionRepo: SessionRepo;
};

export function playersRouter(deps: PlayersRouterDeps): Router {
  const router = Router();

  router.get("/me", async (req: Request, res: Response) => {
    const playerId = req.playerId;
    if (!playerId) {
      // Defensive guard — requireAuth guarantees this on mounted routes.
      throw new ApiError(401, "missing_token", "Missing player identity");
    }
    res.json(await getPlayerProfile(playerId, deps));
  });

  router.patch("/me", async (req: Request, res: Response) => {
    const playerId = req.playerId;
    if (!playerId) {
      // Defensive guard — requireAuth guarantees this on mounted routes.
      throw new ApiError(401, "missing_token", "Missing player identity");
    }
    const { displayName } = parseUpdateDisplayNameBody(req.body);
    res.json(await updateDisplayName(playerId, displayName, deps));
  });

  return router;
}
