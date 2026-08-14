/**
 * Express application assembly.
 *
 * Dependencies are injectable (repo, CORS origin) so tests get isolated
 * state and the entry point controls runtime config.
 */

import express from "express";
import { authRouter } from "./http/routes/auth";
import { sessionsRouter } from "./http/routes/sessions";
import { requireAuth } from "./http/middleware/auth";
import { errorHandler } from "./http/middleware/errors";
import { corsMiddleware } from "./http/middleware/cors";
import { requestLogger } from "./http/middleware/logging";
import { createRateLimiter } from "./http/middleware/rateLimit";
import {
  DEFAULT_AUTH_RATE_LIMIT_MAX,
  DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS,
} from "./config";
import {
  createMemoryPlayerRepo,
  createMemorySessionRepo,
  createMemoryTokenRepo,
} from "./persistence/memory";
import type { PlayerRepo } from "./persistence/repositories";
import type { SessionRepo } from "./persistence/repositories";
import type { TokenRepo } from "./persistence/repositories";

export type AppDeps = {
  /** Session repository (defaults to a fresh in-memory repo). */
  repo?: SessionRepo;
  /** Player repository (defaults to a fresh in-memory repo). */
  playerRepo?: PlayerRepo;
  /** Token repository (defaults to a fresh in-memory repo). */
  tokenRepo?: TokenRepo;
  /** Allowed CORS origin(s): "*" or a comma-separated list. */
  corsOrigin?: string;
  /** Bearer-token lifetime in days (MANA_TOKEN_TTL_DAYS, default 30). */
  tokenTtlDays?: number;
  /**
   * Per-IP rate limit for POST /auth/steam (MANA_AUTH_RATE_LIMIT_MAX /
   * MANA_AUTH_RATE_LIMIT_WINDOW_MS). Ticket grinding protection — docs/auth.md.
   */
  authRateLimitMax?: number;
  authRateLimitWindowMs?: number;
  /**
   * Steam auth config. When omitted or the key is empty, POST /auth/steam is
   * not registered (the server boots without auth).
   */
  steam?: { webApiKey: string; appIds: number[] };
  /** Injectable fetch for the Steam Web API (mocked in tests). */
  steamFetch?: typeof globalThis.fetch;
};

export function createApp(deps: AppDeps = {}): express.Express {
  const repo = deps.repo ?? createMemorySessionRepo();
  const playerRepo = deps.playerRepo ?? createMemoryPlayerRepo();
  const tokenRepo = deps.tokenRepo ?? createMemoryTokenRepo();

  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);
  app.use(corsMiddleware(deps.corsOrigin ?? "*"));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Auth routes — only when a Steam publisher key is configured. Rate-limited
  // per-IP (ticket grinding protection, docs/auth.md).
  if (deps.steam?.webApiKey) {
    app.use(
      "/api/v1/auth",
      createRateLimiter({
        max: deps.authRateLimitMax ?? DEFAULT_AUTH_RATE_LIMIT_MAX,
        windowMs:
          deps.authRateLimitWindowMs ?? DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS,
      }),
      authRouter({
        playerRepo,
        tokenRepo,
        steam: deps.steam,
        steamFetch: deps.steamFetch,
        tokenTtlDays: deps.tokenTtlDays,
      }),
    );
  }

  // Session routes — all authenticated via bearer tokens (X-Player-Id retired)
  app.use("/api/v1/sessions", requireAuth({ tokenRepo }), sessionsRouter(repo));

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
