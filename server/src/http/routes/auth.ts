/**
 * Auth routes — Steam (Electron) and itch.io (web) provider logins
 * (docs/auth.md, docs/itchio-auth.md).
 *
 * POST /auth/steam: the Electron client sends a GetAuthTicketForWebApi ticket
 * (hex) + identity + appId. The server validates it against the Steam Web API
 * (publisher key, server-side only).
 *
 * POST /auth/itch: the browser client sends its itch.io OAuth access token
 * (implicit flow). The server validates it against api.itch.io/profile.
 *
 * Both upsert the player and issue an opaque bearer token. The plaintext token
 * is returned exactly once here — never logged or echoed (the request logger
 * only records method/path/status).
 *
 * Express 5 forwards rejected async handlers to the global error middleware.
 */

import { Router, type Request, type Response } from "express";
import { parseAuthItchBody, parseAuthSteamBody } from "../../dto";
import type { PlayerRepo, TokenRepo } from "../../persistence/repositories";
import {
  createAuthService,
  type Authenticator,
} from "../../services/authService";
import { createItchAuthClient } from "../../services/itchAuth";
import { createSteamAuthClient } from "../../services/steamAuth";

export function authRouter(deps: {
  playerRepo: PlayerRepo;
  tokenRepo: TokenRepo;
  /** Steam config; when omitted or the key is empty, /auth/steam is not registered. */
  steam?: { webApiKey: string; appIds: number[] };
  /** When true, /auth/itch is registered (MANA_ITCH_ENABLED). */
  itch?: boolean;
  steamFetch?: typeof globalThis.fetch;
  /** Injectable fetch for the itch.io profile API (mocked in tests). */
  itchFetch?: typeof globalThis.fetch;
  /** AuthenticateUserTicket endpoint override (MANA_STEAM_API_URL). */
  steamApiUrl?: string;
  tokenTtlDays?: number;
}): Router {
  const authenticators: Authenticator[] = [];

  if (deps.steam?.webApiKey) {
    const steamClient = createSteamAuthClient({
      webApiKey: deps.steam.webApiKey,
      appIds: deps.steam.appIds,
      url: deps.steamApiUrl,
      fetch: deps.steamFetch,
    });
    authenticators.push(steamClient.authenticator);
  }

  if (deps.itch) {
    const itchClient = createItchAuthClient({ fetch: deps.itchFetch });
    authenticators.push(itchClient.authenticator);
  }

  const service = createAuthService({
    playerRepo: deps.playerRepo,
    tokenRepo: deps.tokenRepo,
    tokenTtlDays: deps.tokenTtlDays,
    authenticators,
  });

  const router = Router();

  // POST /auth/steam — ticket → player upsert → { player, token }
  if (deps.steam?.webApiKey) {
    router.post("/steam", async (req: Request, res: Response) => {
      const request = parseAuthSteamBody(req.body);
      const result = await service.login("steam", request);
      res.json({ player: result.player, token: result.token });
    });
  }

  // POST /auth/itch — OAuth token → player upsert → { player, token }
  if (deps.itch) {
    router.post("/itch", async (req: Request, res: Response) => {
      const request = parseAuthItchBody(req.body);
      const result = await service.login("itch", request);
      res.json({ player: result.player, token: result.token });
    });
  }

  return router;
}
