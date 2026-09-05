/**
 * Server configuration from environment variables.
 */
import { STEAM_AUTHENTICATE_URL } from "./services/steamAuth";

export type ServerConfig = {
  port: number;
  host: string;
  corsOrigin: string;
  nodeEnv: string;
  /** MANA_STEAM_WEB_API_KEY — publisher Web API key (server secret, never client-side). */
  steamWebApiKey: string;
  /** MANA_STEAM_APP_IDS — comma-separated allowlist of app ids (alpha + demo). */
  steamAppIds: number[];
  /**
   * MANA_STEAM_API_URL — AuthenticateUserTicket endpoint. Defaults to the
   * partner endpoint (requires a publisher Web API key); point at
   * api.steampowered.com when using a standard Web API key (rate-limited).
   */
  steamApiUrl: string;
  /** MANA_TOKEN_TTL_DAYS — bearer token lifetime (Steam re-issues every launch). */
  tokenTtlDays: number;
  /** MANA_AUTH_RATE_LIMIT_MAX — per-IP request cap for POST /auth/steam. */
  authRateLimitMax: number;
  /** MANA_AUTH_RATE_LIMIT_WINDOW_MS — rate-limit window for auth endpoints. */
  authRateLimitWindowMs: number;
  /**
   * MANA_ITCH_ENABLED — set to `true` to register POST /auth/itch (the web
   * build's itch.io OAuth login). Defaults to `false` (mirrors the Steam gate;
   * itch has no server secret, so it needs an explicit opt-in).
   */
  itchEnabled: boolean;
  /**
   * MANA_GOOGLE_CLIENT_ID — the public Google OAuth client id. Required (with
   * MANA_GOOGLE_ENABLED=true) to register POST /auth/google; the token's
   * `aud` claim must match it exactly. Empty → Google auth disabled.
   */
  googleClientId: string;
  /**
   * MANA_GOOGLE_ENABLED — set to `true` to register POST /auth/google (the
   * Android / web Google sign-in). Defaults to `false` (explicit opt-in, like
   * itch — Google has no server secret).
   */
  googleEnabled: boolean;
  /**
   * MANA_SQLITE_PATH — durable persistence opt-in. A database file path (the
   * parent directory is created on boot) or `:memory:` for a throwaway
   * in-memory SQLite database. `null` (unset) keeps the in-memory repos.
   */
  sqlitePath: string | null;
  /**
   * MANA_FIRESTORE_PROJECT_ID — Firestore opt-in (the Firebase backend). When
   * set, the server uses Firestore repos; when unset, the SQLite / in-memory
   * selection applies. No data migration — Firestore starts as fresh datasets.
   */
  firestoreProjectId: string | null;
};

export function loadConfig(
  env: typeof process.env = process.env,
): ServerConfig {
  return {
    port: parseInt(env["MANA_SERVER_PORT"] ?? "8787", 10),
    host: env["MANA_SERVER_HOST"] ?? "127.0.0.1",
    corsOrigin: env["MANA_CORS_ORIGIN"] ?? "*",
    nodeEnv: env["MANA_NODE_ENV"] ?? "development",
    steamWebApiKey: env["MANA_STEAM_WEB_API_KEY"] ?? "",
    steamAppIds: parseNumberList(env["MANA_STEAM_APP_IDS"], [3757600]),
    steamApiUrl: env["MANA_STEAM_API_URL"]?.trim()
      ? env["MANA_STEAM_API_URL"]
      : STEAM_AUTHENTICATE_URL,
    tokenTtlDays: parsePositiveInt(env["MANA_TOKEN_TTL_DAYS"], 30),
    authRateLimitMax: parsePositiveInt(
      env["MANA_AUTH_RATE_LIMIT_MAX"],
      DEFAULT_AUTH_RATE_LIMIT_MAX,
    ),
    authRateLimitWindowMs: parsePositiveInt(
      env["MANA_AUTH_RATE_LIMIT_WINDOW_MS"],
      DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS,
    ),
    itchEnabled: parseEnabled(env["MANA_ITCH_ENABLED"]),
    googleClientId: env["MANA_GOOGLE_CLIENT_ID"] ?? "",
    googleEnabled: parseEnabled(env["MANA_GOOGLE_ENABLED"]),
    sqlitePath:
      env["MANA_SQLITE_PATH"] && env["MANA_SQLITE_PATH"].trim() !== ""
        ? env["MANA_SQLITE_PATH"]
        : null,
    firestoreProjectId:
      env["MANA_FIRESTORE_PROJECT_ID"] &&
      env["MANA_FIRESTORE_PROJECT_ID"].trim() !== ""
        ? env["MANA_FIRESTORE_PROJECT_ID"].trim()
        : null,
  };
}

/** Default per-IP auth request cap (per window). */
export const DEFAULT_AUTH_RATE_LIMIT_MAX = 20;
/** Default auth rate-limit window: 15 minutes. */
export const DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** "3757600,4233280" → [3757600, 4233280]; falls back when empty/garbage. */
function parseNumberList(
  value: string | undefined,
  fallback: number[],
): number[] {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = value.split(",").map((part) => parseInt(part.trim(), 10));
  if (
    parsed.length === 0 ||
    !parsed.every((n) => Number.isInteger(n) && n > 0)
  ) {
    return fallback;
  }
  return parsed;
}

/** "true"/"1" (case-insensitive) → true; everything else → false. */
function parseEnabled(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

/** Positive integer with a fallback for missing/invalid input. */
function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
