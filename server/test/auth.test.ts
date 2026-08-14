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
