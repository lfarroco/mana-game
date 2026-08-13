/**
 * Server configuration from environment variables.
 */
export type ServerConfig = {
  port: number;
  host: string;
  corsOrigin: string;
  nodeEnv: string;
  /** MANA_STEAM_WEB_API_KEY — publisher Web API key (server secret, never client-side). */
  steamWebApiKey: string;
  /** MANA_STEAM_APP_IDS — comma-separated allowlist of app ids (alpha + demo). */
  steamAppIds: number[];
  /** MANA_TOKEN_TTL_DAYS — bearer token lifetime (Steam re-issues every launch). */
  tokenTtlDays: number;
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
    tokenTtlDays: parsePositiveInt(env["MANA_TOKEN_TTL_DAYS"], 30),
  };
}

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

/** Positive integer with a fallback for missing/invalid input. */
function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
