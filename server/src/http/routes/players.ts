/**
 * Player routes — the authenticated profile endpoint for the multiplayer lobby
 * (`GET /api/v1/players/me`), the display-name change
 * (`PATCH /api/v1/players/me`), guest account conversion
 * (`POST /api/v1/players/me/convert`), and the paginated rating leaderboard
 * (`GET /api/v1/players/ranking`).
 *
 * GET returns everything the lobby needs in one request: identity (display
 * name, provider), the current rating, career + season victory counts, rename
 * availability, and whether an active (resumable) run exists. PATCH sets a
 * new display name (validated, 30-day cooldown, non-guests only) and returns
 * the refreshed profile. POST /convert links a guest account to an itch.io
 * or Google identity and returns the converted player. Identity comes from
 * `req.playerId`, which the bearer-auth middleware (`requireAuth`)
 * guarantees on mounted routes.
 */

import { Router, type Request, type Response } from "express";
import { ApiError } from "../../errors";
import {
  parseConvertAccountBody,
  parseRankingQuery,
  parseUpdateDisplayNameBody,
} from "../../dto";
import {
  convertGuestAccount,
  getPlayerProfile,
  getRankingPage,
  updateDisplayName,
} from "../../services/playerService";
import { createGoogleAuthClient } from "../../services/googleAuth";
import { createItchAuthClient } from "../../services/itchAuth";
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
  /** When true, guests may convert to itch.io (MANA_ITCH_ENABLED). */
  itch?: boolean;
  /** Google client id; when set, guests may convert to Google. */
  google?: { clientId: string };
  /** Injectable fetch for the itch.io profile API (mocked in tests). */
  itchFetch?: typeof globalThis.fetch;
  /** Injectable fetch for Google's tokeninfo endpoint (mocked in tests). */
  googleFetch?: typeof globalThis.fetch;
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

  router.post("/me/convert", async (req: Request, res: Response) => {
    const playerId = req.playerId;
    if (!playerId) {
      // Defensive guard — requireAuth guarantees this on mounted routes.
      throw new ApiError(401, "missing_token", "Missing player identity");
    }
    const input = parseConvertAccountBody(req.body);
    // Credential validators mirror the login providers: a convert target is
    // only offered when its login is enabled (the service rejects otherwise).
    const itch = deps.itch
      ? createItchAuthClient({ fetch: deps.itchFetch })
      : undefined;
    const google = deps.google?.clientId
      ? createGoogleAuthClient({
          clientId: deps.google.clientId,
          fetch: deps.googleFetch,
        })
      : undefined;
    res.json({
      player: await convertGuestAccount(playerId, input, {
        playerRepo: deps.playerRepo,
        itch,
        google,
      }),
    });
  });

  return router;
}
