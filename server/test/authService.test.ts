/**
 * Unit tests for the auth service (plan.md item 3).
 *
 * Covers the provider abstraction: findOrCreatePlayer upsert semantics
 * (repeat logins reuse the same player) and provider-agnostic login through a
 * registered Authenticator. Steam is the only enabled provider this phase.
 */
/// <reference types="jest" />

import { ApiError } from "../src/errors";
import {
  createMemoryPlayerRepo,
  createMemoryTokenRepo,
} from "../src/persistence/memory";
import type { PlayerRepo, TokenRepo } from "../src/persistence/repositories";
import {
  createAuthService,
  type Authenticator,
  type AuthService,
} from "../src/services/authService";
import { createTokenService } from "../src/services/tokenService";

const STEAM_ID_A = "76561198000000000";
const STEAM_ID_B = "76561198000000001";

let playerRepo: PlayerRepo;
let tokenRepo: TokenRepo;
let service: AuthService;

/** Fake steam authenticator: validates the ticket, returns the steamid. */
function makeSteamAuthenticator(
  validTicket = "valid-ticket",
  steamId = STEAM_ID_A,
): Authenticator {
  return {
    provider: "steam",
    async authenticate(credential) {
      const body = credential as { ticket?: string; displayName?: string };
      if (body.ticket !== validTicket) {
        throw new ApiError(401, "invalid_steam_ticket", "Bad steam ticket");
      }
      return { providerId: steamId, displayName: body.displayName ?? "Momo" };
    },
  };
}

beforeEach(() => {
  playerRepo = createMemoryPlayerRepo();
  tokenRepo = createMemoryTokenRepo();
  service = createAuthService({
    playerRepo,
    tokenRepo,
    authenticators: [makeSteamAuthenticator()],
  });
});

describe("findOrCreatePlayer", () => {
  it("creates a player and finds them by provider", () => {
    const player = service.findOrCreatePlayer({
      provider: "steam",
      providerId: STEAM_ID_A,
      displayName: "Momo",
    });

    expect(player.playerId).not.toBe("");
    expect(player.provider).toBe("steam");
    expect(player.providerId).toBe(STEAM_ID_A);
    expect(player.displayName).toBe("Momo");
    expect(playerRepo.findById(player.playerId)).toEqual(player);
  });

  it("reuses the existing player on repeat login (UNIQUE(provider, provider_id))", () => {
    const first = service.findOrCreatePlayer({
      provider: "steam",
      providerId: STEAM_ID_A,
      displayName: "Momo",
    });
    const second = service.findOrCreatePlayer({
      provider: "steam",
      providerId: STEAM_ID_A,
      displayName: "Renamed",
    });

    expect(second.playerId).toBe(first.playerId);
    expect(playerRepo.findByProvider("steam", STEAM_ID_A)).toEqual(first);
  });

  it("keeps distinct steam accounts separate", () => {
    const a = service.findOrCreatePlayer({
      provider: "steam",
      providerId: STEAM_ID_A,
    });
    const b = service.findOrCreatePlayer({
      provider: "steam",
      providerId: STEAM_ID_B,
    });

    expect(a.playerId).not.toBe(b.playerId);
  });
});

describe("login", () => {
  it("validates the credential and returns { player, token }", async () => {
    const result = await service.login("steam", {
      ticket: "valid-ticket",
      displayName: "Momo",
    });

    expect(result.player.providerId).toBe(STEAM_ID_A);
    expect(result.player.displayName).toBe("Momo");
    expect(typeof result.token).toBe("string");
    expect(result.token).toHaveLength(43);

    // Token is issued for the player and stored hashed.
    const tokenService = createTokenService(tokenRepo);
    const record = tokenRepo.findByHash(tokenService.hashToken(result.token))!;
    expect(record.playerId).toBe(result.player.playerId);
  });

  it("repeats logins return the same player with fresh tokens", async () => {
    const first = await service.login("steam", { ticket: "valid-ticket" });
    const second = await service.login("steam", { ticket: "valid-ticket" });

    expect(second.player.playerId).toBe(first.player.playerId);
    expect(second.token).not.toBe(first.token);
  });

  it("propagates authenticator rejection as an error", async () => {
    await expect(service.login("steam", { ticket: "wrong" })).rejects.toThrow(
      expect.objectContaining({ status: 401, code: "invalid_steam_ticket" }),
    );
  });

  it("rejects logins for unregistered providers", async () => {
    await expect(service.login("guest", {})).rejects.toThrow(
      expect.objectContaining({ status: 400 }),
    );
    await expect(
      service.login("steam", { ticket: "valid-ticket" }),
    ).resolves.toBeTruthy();
  });
});
