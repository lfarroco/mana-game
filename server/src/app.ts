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
  createMemoryGhostRepo,
  createMemoryPlayerRepo,
  createMemoryRatingRepo,
  createMemorySessionRepo,
  createMemoryTokenRepo,
} from "./persistence/memory";
import { createSqliteRepos, openSqliteDatabase } from "./persistence/sqlite";
import type {
  GhostRepo,
  PlayerRepo,
  RatingRepo,
  SessionRepo,
  TokenRepo,
} from "./persistence/repositories";

export type AppDeps = {
  /** Session repository (defaults to a fresh in-memory repo). */
  repo?: SessionRepo;
  /** Player repository (defaults to a fresh in-memory repo). */
  playerRepo?: PlayerRepo;
  /** Token repository (defaults to a fresh in-memory repo). */
  tokenRepo?: TokenRepo;
  /** Ghost repository for matchmaking (defaults to a fresh in-memory repo). */
  ghostRepo?: GhostRepo;
  /** Rating repository (defaults to a fresh in-memory repo). */
  ratingRepo?: RatingRepo;
  /**
   * Opt into durable SQLite persistence: when set, the default repositories
   * are backed by a better-sqlite3 Database at this path (`:memory:` for a
   * throwaway in-memory database). Individual `*Repo` deps override the
   * SQLite default for that repo. Unset (default) keeps the in-memory repos.
   */
  sqlitePath?: string;
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
  // Selection logic (docs/game-server.md §Config & deployment): memory repos
  // are the DEFAULT; setting `sqlitePath` (MANA_SQLITE_PATH in index.ts) swaps
  // all five defaults for SQLite-backed repos on one Database. Explicit repo
  // deps always win, so tests can mix implementations freely.
  const sqlite = deps.sqlitePath
    ? createSqliteRepos(openSqliteDatabase(deps.sqlitePath))
    : null;

  const repo = deps.repo ?? sqlite?.sessionRepo ?? createMemorySessionRepo();
  const playerRepo =
    deps.playerRepo ?? sqlite?.playerRepo ?? createMemoryPlayerRepo();
  const tokenRepo = deps.tokenRepo ?? sqlite?.tokenRepo ?? createMemoryTokenRepo();
  const ghostRepo =
    deps.ghostRepo ?? sqlite?.ghostRepo ?? createMemoryGhostRepo();
  const ratingRepo =
    deps.ratingRepo ?? sqlite?.ratingRepo ?? createMemoryRatingRepo();

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
  app.use(
    "/api/v1/sessions",
    requireAuth({ tokenRepo }),
    sessionsRouter({ repo, ghostRepo, ratingRepo, playerRepo }),
  );

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
