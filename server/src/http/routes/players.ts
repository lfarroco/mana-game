/**
 * Player routes — the authenticated profile endpoint for the multiplayer lobby
 * (`GET /api/v1/players/me`), the display-name change
 * (`PATCH /api/v1/players/me`), and the paginated rating leaderboard
 * (`GET /api/v1/players/ranking`).
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
import { parseRankingQuery, parseUpdateDisplayNameBody } from "../../dto";
import {
  getPlayerProfile,
  getRankingPage,
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

  router.get("/ranking", async (req: Request, res: Response) => {
    const playerId = req.playerId;
    if (!playerId) {
      // Defensive guard — requireAuth guarantees this on mounted routes.
      throw new ApiError(401, "missing_token", "Missing player identity");
    }
    const { page, pageSize } = parseRankingQuery(req.query);
    res.json(await getRankingPage(playerId, page, pageSize, deps));
  });

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
