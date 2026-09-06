/**
 * Express application assembly.
 *
 * Dependencies are injectable (repo, CORS origin) so tests get isolated
 * state and the entry point controls runtime config.
 */

import express from "express";
import { authRouter } from "./http/routes/auth";
import { playersRouter } from "./http/routes/players";
import { sessionsRouter } from "./http/routes/sessions";
import { requireAuth } from "./http/middleware/auth";
import { errorHandler } from "./http/middleware/errors";
import { corsMiddleware } from "./http/middleware/cors";
import { requestLogger } from "./http/middleware/logging";
import { createRateLimiter } from "./http/middleware/rateLimit";
import { OAUTH_RELAY_PAGE } from "./http/oauthRelayPage";
import {
  DEFAULT_AUTH_RATE_LIMIT_MAX,
  DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS,
} from "./config";
import {
  createMemoryGhostRepo,
  createMemoryIdempotencyRepo,
  createMemoryPlayerRepo,
  createMemoryPlayerStatsRepo,
  createMemoryRatingRepo,
  createMemorySessionRepo,
  createMemoryTokenRepo,
} from "./persistence/memory";
import { createSqliteRepos, openSqliteDatabase } from "./persistence/sqlite";
import { createFirestoreRepos } from "./persistence/firestore";
import { TRUSTED_PROXY_RANGES } from "./trustProxy";
import type { Firestore } from "firebase-admin/firestore";
import type {
  GhostRepo,
  IdempotencyRepo,
  PlayerRepo,
  PlayerStatsRepo,
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
  /** Run-completions repository for lobby stats (defaults to a fresh in-memory repo). */
  playerStatsRepo?: PlayerStatsRepo;
  /** Action-idempotency store (defaults to a fresh in-memory repo). */
  idempotencyRepo?: IdempotencyRepo;
  /**
   * Firestore database (the Firebase backend). When set, the default
   * repositories are Firestore-backed; explicit `*Repo` deps still override
   * per repo, and `sqlitePath` is ignored (Functions have no durable disk).
   * The Admin SDK authenticates via Application Default Credentials, or the
   * emulator via FIRESTORE_EMULATOR_HOST.
   */
  firestoreDb?: Firestore;
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
   * not registered.
   */
  steam?: { webApiKey: string; appIds: number[] };
  /**
   * Enable itch.io auth (POST /auth/itch) for the web build. Explicit opt-in
   * (mirrors the Steam gate); the auth mount itself is always registered
   * because POST /auth/guest needs no provider config.
   */
  itch?: boolean;
  /**
   * Google auth config. When omitted or the client id is empty, POST
   * /auth/google is not registered.
   */
  google?: { clientId: string };
  /**
   * AuthenticateUserTicket endpoint override (MANA_STEAM_API_URL): defaults
   * to the partner endpoint (publisher key); api.steampowered.com works with
   * a standard Web API key (rate-limited).
   */
  steamApiUrl?: string;
  /** Injectable fetch for the Steam Web API (mocked in tests). */
  steamFetch?: typeof globalThis.fetch;
  /** Injectable fetch for the itch.io profile API (mocked in tests). */
  itchFetch?: typeof globalThis.fetch;
  /** Injectable fetch for Google's tokeninfo endpoint (mocked in tests). */
  googleFetch?: typeof globalThis.fetch;
};

export function createApp(deps: AppDeps = {}): express.Express {
  // Selection logic: memory repos are the DEFAULT; `firestoreDb`
  // (MANA_FIRESTORE_PROJECT_ID) swaps all seven defaults for Firestore-backed
  // repos, and `sqlitePath` (MANA_SQLITE_PATH) swaps them for SQLite-backed
  // repos on one Database. Firestore wins over SQLite when both are set
  // (Functions have no durable disk). Explicit repo deps always win, so tests
  // can mix implementations freely.
  const sqlite = deps.sqlitePath
    ? createSqliteRepos(openSqliteDatabase(deps.sqlitePath))
    : null;
  const firestore = deps.firestoreDb
    ? createFirestoreRepos(deps.firestoreDb)
    : null;

  const repo =
    deps.repo ??
    firestore?.sessionRepo ??
    sqlite?.sessionRepo ??
    createMemorySessionRepo();
  const playerRepo =
    deps.playerRepo ??
    firestore?.playerRepo ??
    sqlite?.playerRepo ??
    createMemoryPlayerRepo();
  const tokenRepo =
    deps.tokenRepo ??
    firestore?.tokenRepo ??
    sqlite?.tokenRepo ??
    createMemoryTokenRepo();
  const ghostRepo =
    deps.ghostRepo ??
    firestore?.ghostRepo ??
    sqlite?.ghostRepo ??
    createMemoryGhostRepo();
  const ratingRepo =
    deps.ratingRepo ??
    firestore?.ratingRepo ??
    sqlite?.ratingRepo ??
    createMemoryRatingRepo();
  const playerStatsRepo =
    deps.playerStatsRepo ??
    firestore?.playerStatsRepo ??
    sqlite?.playerStatsRepo ??
    createMemoryPlayerStatsRepo();
  const idempotencyRepo =
    deps.idempotencyRepo ??
    firestore?.idempotencyRepo ??
    sqlite?.idempotencyRepo ??
    createMemoryIdempotencyRepo();

  const app = express();

  // Real-client-IP resolution behind the reverse proxies (Cloudflare → Caddy →
  // this process). Trust loopback (Caddy) plus Cloudflare's edge ranges so the
  // auth rate limiter keys per player instead of per Cloudflare PoP — see
  // src/trustProxy.ts for the full rationale and the spoofing analysis.
  app.set("trust proxy", TRUSTED_PROXY_RANGES);

  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);
  app.use(corsMiddleware(deps.corsOrigin ?? "*"));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // OAuth relay page (docs/android-multiplayer.md) — the itch.io and Google
  // authorize URLs redirect here with the credential in the URL hash; this
  // static page forwards it back to the app (custom-scheme deep link on
  // Android) or the opener (web). No state, no logging.
  app.get("/oauth/callback", (_req, res) => {
    res.type("html").send(OAUTH_RELAY_PAGE);
  });

  // Auth routes — always mounted (`POST /auth/guest` needs no provider
  // config; Steam/itch/Google logins register inside when configured).
  // Rate-limited per-IP (ticket/token grinding protection, docs/auth.md).
  app.use(
    "/api/v1/auth",
    createRateLimiter({
      max: deps.authRateLimitMax ?? DEFAULT_AUTH_RATE_LIMIT_MAX,
      windowMs: deps.authRateLimitWindowMs ?? DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS,
    }),
    authRouter({
      playerRepo,
      tokenRepo,
      steam: deps.steam,
      itch: deps.itch,
      google: deps.google,
      steamFetch: deps.steamFetch,
      itchFetch: deps.itchFetch,
      googleFetch: deps.googleFetch,
      steamApiUrl: deps.steamApiUrl,
      tokenTtlDays: deps.tokenTtlDays,
    }),
  );

  // Session routes — all authenticated via bearer tokens (X-Player-Id retired)
  app.use(
    "/api/v1/sessions",
    requireAuth({ tokenRepo }),
    sessionsRouter({
      repo,
      ghostRepo,
      ratingRepo,
      playerRepo,
      playerStatsRepo,
      idempotencyRepo,
    }),
  );

  // Player routes — the lobby profile endpoint + guest conversion,
  // bearer-authenticated.
  app.use(
    "/api/v1/players",
    requireAuth({ tokenRepo }),
    playersRouter({
      playerRepo,
      ratingRepo,
      playerStatsRepo,
      sessionRepo: repo,
      itch: deps.itch,
      google: deps.google,
      itchFetch: deps.itchFetch,
      googleFetch: deps.googleFetch,
    }),
  );

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
