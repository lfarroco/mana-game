/**
 * Auth routes — Steam auto-login (Steam-only this phase, docs/auth.md).
 *
 * POST /auth/steam: the Electron client sends a GetAuthTicketForWebApi ticket
 * (hex) + identity + appId. The server validates it against the Steam Web API
 * (publisher key, server-side only), upserts the player, and issues an opaque
 * bearer token. The plaintext token is returned exactly once here — never
 * logged or echoed (the request logger only records method/path/status).
 *
 * Express 5 forwards rejected async handlers to the global error middleware.
 */

import { Router, type Request, type Response } from "express";
import { parseAuthSteamBody } from "../../dto";
import type { PlayerRepo, TokenRepo } from "../../persistence/repositories";
import { createAuthService } from "../../services/authService";
import { createSteamAuthClient } from "../../services/steamAuth";

export function authRouter(deps: {
  playerRepo: PlayerRepo;
  tokenRepo: TokenRepo;
  steam: { webApiKey: string; appIds: number[] };
  steamFetch?: typeof globalThis.fetch;
  tokenTtlDays?: number;
}): Router {
  const steamClient = createSteamAuthClient({
    webApiKey: deps.steam.webApiKey,
    appIds: deps.steam.appIds,
    fetch: deps.steamFetch,
  });
  const service = createAuthService({
    playerRepo: deps.playerRepo,
    tokenRepo: deps.tokenRepo,
    tokenTtlDays: deps.tokenTtlDays,
    authenticators: [steamClient.authenticator],
  });

  const router = Router();

  // POST /auth/steam — ticket → player upsert → { player, token }
  router.post("/steam", async (req: Request, res: Response) => {
    const request = parseAuthSteamBody(req.body);
    const result = await service.login("steam", request);
    res.json({ player: result.player, token: result.token });
  });

  return router;
}
