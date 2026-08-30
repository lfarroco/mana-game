/**
 * HTTP integration tests for POST /api/v1/auth/steam (plan.md item 5).
 *
 * The Steam Web API is mocked via createApp's injectable steamFetch — the
 * full request path (body → DTO → steamAuth → authService → token) runs
 * without any real Steam dependency.
 */
/// <reference types="jest" />

import request from "supertest";
import type { Express } from "express";
import { createApp, type AppDeps } from "../src/app";
import {
  createMemoryPlayerRepo,
  createMemoryTokenRepo,
} from "../src/persistence/memory";
import type { PlayerRepo, TokenRepo } from "../src/persistence/repositories";
import { STEAM_IDENTITY } from "../src/services/steamAuth";
import { createTokenService } from "../src/services/tokenService";

const KEY = "test-publisher-key";
const APP_IDS = [3757600, 4233280];
const STEAM_ID_A = "76561198000000000";
const STEAM_ID_B = "76561198000000001";
const TICKET = "deadbeef";

type SteamMockOptions = {
  steamId?: string;
  ok?: boolean;
  status?: number;
};

type FetchImpl = typeof globalThis.fetch;

/** Fake fetch standing in for the Steam Web API. */
function createSteamFetchMock(options: SteamMockOptions = {}) {
  const calls: string[] = [];
  const fetch: FetchImpl = (async (url: string) => {
    calls.push(url);
    return {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      json: async () => ({
        response: {
          params: { result: "OK", steamid: options.steamId ?? STEAM_ID_A },
        },
      }),
    } as unknown as Response;
  }) as FetchImpl;
  return { fetch, calls };
}

let playerRepo: PlayerRepo;
let tokenRepo: TokenRepo;

beforeEach(() => {
  playerRepo = createMemoryPlayerRepo();
  tokenRepo = createMemoryTokenRepo();
});

function createTestApp(
  steamFetch: typeof fetch,
  overrides: Partial<AppDeps> = {},
): Express {
  return createApp({
    playerRepo,
    tokenRepo,
    steam: { webApiKey: KEY, appIds: APP_IDS },
    steamFetch,
    ...overrides,
  });
}

describe("POST /api/v1/auth/steam", () => {
  it("validates a ticket and returns { player, token }", async () => {
    const { fetch, calls } = createSteamFetchMock();
    const app = createTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/steam")
      .send({ ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 });

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("appid=3757600");
    expect(calls[0]).toContain(`identity=${STEAM_IDENTITY}`);
    expect(calls[0]).toContain(`ticket=${TICKET}`);

    const { player, token } = res.body as {
      player: { playerId: string; provider: string; providerId: string };
      token: string;
    };
    expect(player.provider).toBe("steam");
    expect(player.providerId).toBe(STEAM_ID_A);
    expect(player.playerId).not.toBe("");
    expect(typeof token).toBe("string");
    expect(token).toHaveLength(43);

    // The plaintext is NOT stored — only its SHA-256 hash.
    const tokenService = createTokenService(tokenRepo);
    const record = tokenRepo.findByHash(tokenService.hashToken(token));
    expect(record).not.toBeNull();
    expect(record!.playerId).toBe(player.playerId);
    expect(tokenRepo.findByHash(token)).toBeNull();
  });

  it("uses the client-supplied steam persona as displayName", async () => {
    const app = createTestApp(createSteamFetchMock().fetch);

    const res = await request(app).post("/api/v1/auth/steam").send({
      ticket: TICKET,
      identity: STEAM_IDENTITY,
      appId: 3757600,
      displayName: "Momo",
    });

    expect(res.status).toBe(200);
    expect(res.body.player.displayName).toBe("Momo");
  });

  it("repeat logins return the same player with a fresh token", async () => {
    const app = createTestApp(createSteamFetchMock().fetch);
    const body = { ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 };

    const first = await request(app).post("/api/v1/auth/steam").send(body);
    const second = await request(app).post("/api/v1/auth/steam").send(body);

    expect(second.status).toBe(200);
    expect(second.body.player.playerId).toBe(first.body.player.playerId);
    expect(second.body.token).not.toBe(first.body.token);
    expect(playerRepo.findByProvider("steam", STEAM_ID_A)).not.toBeNull();
  });

  it("keeps distinct steam accounts as distinct players (isolation)", async () => {
    const app = createTestApp(
      createSteamFetchMock({ steamId: STEAM_ID_A }).fetch,
    );
    const appB = createTestApp(
      createSteamFetchMock({ steamId: STEAM_ID_B }).fetch,
    );
    const body = { ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 };

    const resA = await request(app).post("/api/v1/auth/steam").send(body);
    const resB = await request(appB).post("/api/v1/auth/steam").send(body);

    expect(resB.body.player.playerId).not.toBe(resA.body.player.playerId);
    expect(resB.body.token).not.toBe(resA.body.token);
  });

  it("rejects a ticket Steam invalidates (non-200)", async () => {
    const app = createTestApp(
      createSteamFetchMock({ ok: false, status: 401 }).fetch,
    );

    const res = await request(app)
      .post("/api/v1/auth/steam")
      .send({ ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_steam_ticket");
  });

  it("rejects a mismatched identity without calling the Web API", async () => {
    const { fetch, calls } = createSteamFetchMock();
    const app = createTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/steam")
      .send({ ticket: TICKET, identity: "wrong-server", appId: 3757600 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_identity");
    expect(calls).toHaveLength(0);
  });

  it("rejects an appId outside the allowlist without calling the Web API", async () => {
    const { fetch, calls } = createSteamFetchMock();
    const app = createTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/steam")
      .send({ ticket: TICKET, identity: STEAM_IDENTITY, appId: 9999999 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_steam_ticket");
    expect(calls).toHaveLength(0);
  });

  it("rejects malformed bodies with 400", async () => {
    const app = createTestApp(createSteamFetchMock().fetch);

    const cases: object[] = [
      {},
      { identity: STEAM_IDENTITY, appId: 3757600 }, // missing ticket
      { ticket: "not-hex!", identity: STEAM_IDENTITY, appId: 3757600 },
      { ticket: "", identity: STEAM_IDENTITY, appId: 3757600 },
      { ticket: TICKET, appId: 3757600 }, // missing identity
      { ticket: TICKET, identity: "  ", appId: 3757600 },
      { ticket: TICKET, identity: STEAM_IDENTITY }, // missing appId
      { ticket: TICKET, identity: STEAM_IDENTITY, appId: "3757600" },
      { ticket: TICKET, identity: STEAM_IDENTITY, appId: 0 },
    ];

    for (const body of cases) {
      const res = await request(app).post("/api/v1/auth/steam").send(body);
      expect(res.status).toBe(400);
    }
  });

  it("is not registered when no steam config is provided", async () => {
    const app = createApp({ playerRepo, tokenRepo });

    const res = await request(app)
      .post("/api/v1/auth/steam")
      .send({ ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/auth/itch", () => {
  const ITCH_ID_A = 1994;
  const ITCH_USERNAME_A = "Momo";
  const ITCH_TOKEN = "valid-itch-token";

  type ItchMockOptions = {
    ok?: boolean;
    status?: number;
    userId?: number;
    username?: string;
  };

  /** Fake fetch standing in for the itch.io profile API. */
  function createItchFetchMock(options: ItchMockOptions = {}) {
    const calls: string[] = [];
    const fetch: FetchImpl = (async (url: string) => {
      calls.push(url);
      return {
        ok: options.ok ?? true,
        status: options.status ?? 200,
        json: async () => ({
          user: {
            id: options.userId ?? ITCH_ID_A,
            username: options.username ?? ITCH_USERNAME_A,
          },
        }),
      } as unknown as Response;
    }) as FetchImpl;
    return { fetch, calls };
  }

  function createItchTestApp(
    itchFetch: typeof fetch,
    overrides: Partial<AppDeps> = {},
  ): Express {
    return createApp({
      playerRepo,
      tokenRepo,
      itch: true,
      itchFetch,
      ...overrides,
    });
  }

  it("validates an itch token and returns { player, token } with provider itch", async () => {
    const { fetch, calls } = createItchFetchMock();
    const app = createItchTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/itch")
      .send({ token: ITCH_TOKEN });

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);

    const { player, token } = res.body as {
      player: {
        playerId: string;
        provider: string;
        providerId: string;
        displayName?: string;
      };
      token: string;
    };
    expect(player.provider).toBe("itch");
    expect(player.providerId).toBe(String(ITCH_ID_A));
    expect(player.displayName).toBe(ITCH_USERNAME_A);
    expect(player.playerId).not.toBe("");
    expect(typeof token).toBe("string");
    expect(token).toHaveLength(43);

    // The plaintext is NOT stored — only its SHA-256 hash.
    const tokenService = createTokenService(tokenRepo);
    const record = tokenRepo.findByHash(tokenService.hashToken(token));
    expect(record).not.toBeNull();
    expect(record!.playerId).toBe(player.playerId);
    expect(tokenRepo.findByHash(token)).toBeNull();
  });

  it("uses the server-verified username as displayName", async () => {
    const { fetch } = createItchFetchMock({ username: "itchy_player" });
    const app = createItchTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/itch")
      .send({ token: ITCH_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.player.displayName).toBe("itchy_player");
  });

  it("repeat logins return the same player with a fresh token", async () => {
    const { fetch } = createItchFetchMock();
    const app = createItchTestApp(fetch);

    const first = await request(app)
      .post("/api/v1/auth/itch")
      .send({ token: ITCH_TOKEN });
    const second = await request(app)
      .post("/api/v1/auth/itch")
      .send({ token: ITCH_TOKEN });

    expect(second.status).toBe(200);
    expect(second.body.player.playerId).toBe(first.body.player.playerId);
    expect(second.body.token).not.toBe(first.body.token);
    expect(playerRepo.findByProvider("itch", String(ITCH_ID_A))).not.toBeNull();
  });

  it("rejects a token itch.io invalidates (non-200)", async () => {
    const { fetch } = createItchFetchMock({ ok: false, status: 401 });
    const app = createItchTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/itch")
      .send({ token: "garbage-token" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_itch_token");
  });

  it("rejects malformed bodies with 400 without calling the profile API", async () => {
    const { fetch, calls } = createItchFetchMock();
    const app = createItchTestApp(fetch);

    for (const body of [{}, { token: 42 }, { token: "" }, { token: "   " }]) {
      const res = await request(app).post("/api/v1/auth/itch").send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_itch_token");
    }
    expect(calls).toHaveLength(0);
  });

  it("is not registered when itch is disabled", async () => {
    const app = createApp({ playerRepo, tokenRepo });

    const res = await request(app)
      .post("/api/v1/auth/itch")
      .send({ token: ITCH_TOKEN });

    expect(res.status).toBe(404);
  });

  it("is rate-limited per-IP like the Steam endpoint", async () => {
    const { fetch } = createItchFetchMock();
    const app = createItchTestApp(fetch, {
      authRateLimitMax: 3,
      authRateLimitWindowMs: 60_000,
    });

    for (let i = 0; i < 3; i++) {
      const ok = await request(app)
        .post("/api/v1/auth/itch")
        .send({ token: ITCH_TOKEN });
      expect(ok.status).toBe(200);
    }

    const limited = await request(app)
      .post("/api/v1/auth/itch")
      .send({ token: ITCH_TOKEN });
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe("rate_limited");
  });
});

describe("POST /api/v1/auth/google", () => {
  const GOOGLE_CLIENT_ID = "mana-battle-google-client.apps.googleusercontent.com";
  const GOOGLE_ID_A = "112233445566778899000";
  const GOOGLE_NAME_A = "Momo Player";
  const ID_TOKEN = "valid-google-id-token";

  type GoogleMockOptions = {
    ok?: boolean;
    status?: number;
    aud?: string;
    sub?: string;
    name?: string;
    iss?: string;
  };

  /** Fake fetch standing in for Google's tokeninfo endpoint. */
  function createGoogleFetchMock(options: GoogleMockOptions = {}) {
    const calls: string[] = [];
    const fetch: FetchImpl = (async (url: string) => {
      calls.push(url);
      return {
        ok: options.ok ?? true,
        status: options.status ?? 200,
        json: async () => ({
          iss: options.iss ?? "https://accounts.google.com",
          aud: options.aud ?? GOOGLE_CLIENT_ID,
          sub: options.sub ?? GOOGLE_ID_A,
          name: options.name ?? GOOGLE_NAME_A,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      } as unknown as Response;
    }) as FetchImpl;
    return { fetch, calls };
  }

  function createGoogleTestApp(
    googleFetch: typeof fetch,
    overrides: Partial<AppDeps> = {},
  ): Express {
    return createApp({
      playerRepo,
      tokenRepo,
      google: { clientId: GOOGLE_CLIENT_ID },
      googleFetch,
      ...overrides,
    });
  }

  it("validates an ID token and returns { player, token } with provider google", async () => {
    const { fetch, calls } = createGoogleFetchMock();
    const app = createGoogleTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/google")
      .send({ idToken: ID_TOKEN });

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("id_token=");

    const { player, token } = res.body as {
      player: {
        playerId: string;
        provider: string;
        providerId: string;
        displayName?: string;
      };
      token: string;
    };
    expect(player.provider).toBe("google");
    expect(player.providerId).toBe(GOOGLE_ID_A);
    expect(player.displayName).toBe(GOOGLE_NAME_A);
    expect(player.playerId).not.toBe("");
    expect(typeof token).toBe("string");
    expect(token).toHaveLength(43);

    // The plaintext is NOT stored — only its SHA-256 hash.
    const tokenService = createTokenService(tokenRepo);
    const record = tokenRepo.findByHash(tokenService.hashToken(token));
    expect(record).not.toBeNull();
    expect(record!.playerId).toBe(player.playerId);
    expect(tokenRepo.findByHash(token)).toBeNull();
  });

  it("uses the server-verified name as displayName", async () => {
    const { fetch } = createGoogleFetchMock({ name: "Veronica_Dev" });
    const app = createGoogleTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/google")
      .send({ idToken: ID_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.player.displayName).toBe("Veronica_Dev");
  });

  it("repeat logins return the same player with a fresh token", async () => {
    const { fetch } = createGoogleFetchMock();
    const app = createGoogleTestApp(fetch);

    const first = await request(app)
      .post("/api/v1/auth/google")
      .send({ idToken: ID_TOKEN });
    const second = await request(app)
      .post("/api/v1/auth/google")
      .send({ idToken: ID_TOKEN });

    expect(second.status).toBe(200);
    expect(second.body.player.playerId).toBe(first.body.player.playerId);
    expect(second.body.token).not.toBe(first.body.token);
    expect(
      playerRepo.findByProvider("google", GOOGLE_ID_A),
    ).not.toBeNull();
  });

  it("rejects an ID token Google invalidates (non-200)", async () => {
    const { fetch } = createGoogleFetchMock({ ok: false, status: 400 });
    const app = createGoogleTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/google")
      .send({ idToken: "garbage-token" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_google_token");
  });

  it("rejects a token whose audience does not match the configured client id", async () => {
    const { fetch } = createGoogleFetchMock({
      aud: "someone-elses-client.apps.googleusercontent.com",
    });
    const app = createGoogleTestApp(fetch);

    const res = await request(app)
      .post("/api/v1/auth/google")
      .send({ idToken: ID_TOKEN });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_google_token");
  });

  it("rejects malformed bodies with 400 without calling tokeninfo", async () => {
    const { fetch, calls } = createGoogleFetchMock();
    const app = createGoogleTestApp(fetch);

    for (const body of [
      {},
      { idToken: 42 },
      { idToken: "" },
      { idToken: "   " },
    ]) {
      const res = await request(app).post("/api/v1/auth/google").send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_google_token");
    }
    expect(calls).toHaveLength(0);
  });

  it("is not registered when google is not configured", async () => {
    const app = createApp({ playerRepo, tokenRepo });

    const res = await request(app)
      .post("/api/v1/auth/google")
      .send({ idToken: ID_TOKEN });

    expect(res.status).toBe(404);
  });

  it("is rate-limited per-IP like the other auth endpoints", async () => {
    const { fetch } = createGoogleFetchMock();
    const app = createGoogleTestApp(fetch, {
      authRateLimitMax: 3,
      authRateLimitWindowMs: 60_000,
    });

    for (let i = 0; i < 3; i++) {
      const ok = await request(app)
        .post("/api/v1/auth/google")
        .send({ idToken: ID_TOKEN });
      expect(ok.status).toBe(200);
    }

    const limited = await request(app)
      .post("/api/v1/auth/google")
      .send({ idToken: ID_TOKEN });
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe("rate_limited");
  });
});
