/**
 * Player routes — the authenticated profile endpoint for the multiplayer lobby
 * (`GET /api/v1/players/me`).
 *
 * Returns everything the lobby needs in one request: identity (display name,
 * provider), the current rating, career + season victory counts, and whether
 * an active (resumable) run exists. Identity comes from `req.playerId`, which
 * the bearer-auth middleware (`requireAuth`) guarantees on mounted routes.
 */

import { Router, type Request, type Response } from "express";
import { ApiError } from "../../errors";
import { getPlayerProfile } from "../../services/playerService";
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

  router.get("/me", (req: Request, res: Response) => {
    const playerId = req.playerId;
    if (!playerId) {
      // Defensive guard — requireAuth guarantees this on mounted routes.
      throw new ApiError(401, "missing_token", "Missing player identity");
    }
    res.json(getPlayerProfile(playerId, deps));
  });

  return router;
}
