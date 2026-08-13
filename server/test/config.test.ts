/**
 * Unit tests for environment-variable configuration (plan.md item 6).
 */
/// <reference types="jest" />

import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("applies defaults when no env vars are set", () => {
    const config = loadConfig({});

    expect(config.port).toBe(8787);
    expect(config.host).toBe("127.0.0.1");
    expect(config.corsOrigin).toBe("*");
    expect(config.nodeEnv).toBe("development");
    expect(config.steamWebApiKey).toBe("");
    expect(config.steamAppIds).toEqual([3757600]); // alpha app id
    expect(config.tokenTtlDays).toBe(30);
  });

  it("reads the steam web api key", () => {
    const config = loadConfig({ MANA_STEAM_WEB_API_KEY: "supersecret" });
    expect(config.steamWebApiKey).toBe("supersecret");
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
});
