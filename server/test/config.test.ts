/**
 * Unit tests for environment-variable configuration (plan.md item 6).
 */
/// <reference types="jest" />

import { loadConfig } from "../src/config";
import { STEAM_AUTHENTICATE_URL } from "../src/services/steamAuth";

describe("loadConfig", () => {
  it("applies defaults when no env vars are set", () => {
    const config = loadConfig({});

    expect(config.port).toBe(8787);
    expect(config.host).toBe("127.0.0.1");
    expect(config.corsOrigin).toBe("*");
    expect(config.nodeEnv).toBe("development");
    expect(config.steamWebApiKey).toBe("");
    expect(config.steamAppIds).toEqual([3757600]); // alpha app id
    expect(config.steamApiUrl).toBe(STEAM_AUTHENTICATE_URL); // partner endpoint
    expect(config.tokenTtlDays).toBe(30);
    expect(config.googleClientId).toBe("");
    expect(config.googleEnabled).toBe(false);
  });

  it("reads the google client id and enabled flag", () => {
    const config = loadConfig({
      MANA_GOOGLE_CLIENT_ID: "mana-battle.apps.googleusercontent.com",
      MANA_GOOGLE_ENABLED: "true",
    });
    expect(config.googleClientId).toBe(
      "mana-battle.apps.googleusercontent.com",
    );
    expect(config.googleEnabled).toBe(true);
  });

  it("defaults google auth to disabled", () => {
    expect(loadConfig({}).googleEnabled).toBe(false);
    expect(
      loadConfig({ MANA_GOOGLE_ENABLED: "false" }).googleEnabled,
    ).toBe(false);
    expect(loadConfig({ MANA_GOOGLE_ENABLED: "garbage" }).googleEnabled).toBe(
      false,
    );
  });

  it("reads the steam web api key", () => {
    const config = loadConfig({ MANA_STEAM_WEB_API_KEY: "supersecret" });
    expect(config.steamWebApiKey).toBe("supersecret");
  });

  it("overrides the steam auth endpoint (standard-key fallback)", () => {
    const config = loadConfig({
      MANA_STEAM_API_URL:
        "https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/",
    });
    expect(config.steamApiUrl).toBe(
      "https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/",
    );
  });

  it("falls back to the partner endpoint for empty MANA_STEAM_API_URL", () => {
    expect(loadConfig({ MANA_STEAM_API_URL: "" }).steamApiUrl).toBe(
      STEAM_AUTHENTICATE_URL,
    );
    expect(loadConfig({ MANA_STEAM_API_URL: "   " }).steamApiUrl).toBe(
      STEAM_AUTHENTICATE_URL,
    );
  });

  it("parses a comma-separated app id allowlist", () => {
    const config = loadConfig({ MANA_STEAM_APP_IDS: "3757600,4233280" });
    expect(config.steamAppIds).toEqual([3757600, 4233280]);
  });

  it("falls back to the default app id list on garbage input", () => {
    const config = loadConfig({ MANA_STEAM_APP_IDS: "abc,," });
    expect(config.steamAppIds).toEqual([3757600]);
  });

  it("parses the token TTL", () => {
    const config = loadConfig({ MANA_TOKEN_TTL_DAYS: "7" });
    expect(config.tokenTtlDays).toBe(7);
  });

  it("falls back to 30 days on invalid TTL input", () => {
    expect(loadConfig({ MANA_TOKEN_TTL_DAYS: "nope" }).tokenTtlDays).toBe(30);
    expect(loadConfig({ MANA_TOKEN_TTL_DAYS: "0" }).tokenTtlDays).toBe(30);
    expect(loadConfig({ MANA_TOKEN_TTL_DAYS: "-3" }).tokenTtlDays).toBe(30);
  });

  it("applies auth rate-limit defaults when no env vars are set", () => {
    const config = loadConfig({});
    expect(config.authRateLimitMax).toBe(20);
    expect(config.authRateLimitWindowMs).toBe(15 * 60 * 1000);
  });

  it("parses the auth rate-limit env vars", () => {
    const config = loadConfig({
      MANA_AUTH_RATE_LIMIT_MAX: "50",
      MANA_AUTH_RATE_LIMIT_WINDOW_MS: "60000",
    });
    expect(config.authRateLimitMax).toBe(50);
    expect(config.authRateLimitWindowMs).toBe(60_000);
  });

  it("falls back on invalid auth rate-limit input", () => {
    const config = loadConfig({
      MANA_AUTH_RATE_LIMIT_MAX: "abc",
      MANA_AUTH_RATE_LIMIT_WINDOW_MS: "0",
    });
    expect(config.authRateLimitMax).toBe(20);
    expect(config.authRateLimitWindowMs).toBe(15 * 60 * 1000);
  });

  it("defaults sqlitePath to null (in-memory repos)", () => {
    const config = loadConfig({});
    expect(config.sqlitePath).toBeNull();
  });

  it("reads MANA_SQLITE_PATH", () => {
    const config = loadConfig({ MANA_SQLITE_PATH: "./data/mana.db" });
    expect(config.sqlitePath).toBe("./data/mana.db");
  });

  it("supports :memory: sqlite databases", () => {
    const config = loadConfig({ MANA_SQLITE_PATH: ":memory:" });
    expect(config.sqlitePath).toBe(":memory:");
  });

  it("falls back to in-memory repos for empty MANA_SQLITE_PATH", () => {
    expect(loadConfig({ MANA_SQLITE_PATH: "" }).sqlitePath).toBeNull();
    expect(loadConfig({ MANA_SQLITE_PATH: "   " }).sqlitePath).toBeNull();
  });

  it("defaults itch auth to disabled", () => {
    expect(loadConfig({}).itchEnabled).toBe(false);
  });

  it("reads MANA_ITCH_ENABLED", () => {
    expect(loadConfig({ MANA_ITCH_ENABLED: "true" }).itchEnabled).toBe(true);
    expect(loadConfig({ MANA_ITCH_ENABLED: "TRUE" }).itchEnabled).toBe(true);
    expect(loadConfig({ MANA_ITCH_ENABLED: "1" }).itchEnabled).toBe(true);
    expect(loadConfig({ MANA_ITCH_ENABLED: "false" }).itchEnabled).toBe(false);
    expect(loadConfig({ MANA_ITCH_ENABLED: "garbage" }).itchEnabled).toBe(
      false,
    );
  });
});
