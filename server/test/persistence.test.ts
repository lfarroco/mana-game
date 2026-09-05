/**
 * Unit tests for the in-memory player and token repositories (plan.md item 1).
 *
 * Covers the PlayerRepo UNIQUE(provider, provider_id) upsert invariant — one
 * Steam account maps to exactly one player, and repeat logins return the same
 * player — and the TokenRepo hash-keyed storage with multi-token-per-player
 * support.
 */
/// <reference types="jest" />

import {
  createMemoryPlayerRepo,
  createMemoryTokenRepo,
} from "../src/persistence/memory";
import type { Player, TokenRecord } from "../src/persistence/repositories";

/** 17-digit steamid64 (see docs/auth.md — reject non-17-digit steamids). */
const STEAM_ID_A = "76561198000000000";
const STEAM_ID_B = "76561198000000001";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    playerId: "player-uuid",
    provider: "steam",
    providerId: STEAM_ID_A,
    displayName: "Momo",
    createdAt: 1_752_000_000_000,
    ...overrides,
  };
}

function makeToken(overrides: Partial<TokenRecord> = {}): TokenRecord {
  return {
    tokenHash: "hash-1",
    playerId: "player-uuid",
    expiresAt: 1_752_300_000_000,
    createdAt: 1_752_000_000_000,
    ...overrides,
  };
}

describe("createMemoryPlayerRepo", () => {
  it("stores a player and finds them by id and by provider", async () => {
    const repo = createMemoryPlayerRepo();
    const player = makePlayer();

    (await repo.create(player));

    expect((await repo.findById(player.playerId))).toEqual(player);
    expect((await repo.findByProvider("steam", STEAM_ID_A))).toEqual(player);
  });

  it("returns null when no player matches", async () => {
    const repo = createMemoryPlayerRepo();

    expect((await repo.findById("nobody"))).toBeNull();
    expect((await repo.findByProvider("steam", "76561198000009999"))).toBeNull();
  });

  it("enforces UNIQUE(provider, provider_id): repeat login returns the same player", async () => {
    const repo = createMemoryPlayerRepo();
    const first = makePlayer({ playerId: "player-1" });

    const created = (await repo.create(first));
    const secondAttempt = (await repo.create(makePlayer({ playerId: "player-2" })));

    expect(created).toEqual(first);
    expect(secondAttempt).toEqual(first); // same steam account → same player
    expect((await repo.findById("player-2"))).toBeNull(); // no duplicate row created
  });

  it("treats distinct steam accounts as distinct players", async () => {
    const repo = createMemoryPlayerRepo();
    const momo = makePlayer({ playerId: "p-1", providerId: STEAM_ID_A });
    const other = makePlayer({ playerId: "p-2", providerId: STEAM_ID_B });

    (await repo.create(momo));
    (await repo.create(other));

    expect((await repo.findByProvider("steam", STEAM_ID_A))).toEqual(momo);
    expect((await repo.findByProvider("steam", STEAM_ID_B))).toEqual(other);
  });

  it("treats the same providerId under different providers as distinct players", async () => {
    const repo = createMemoryPlayerRepo();
    const steam = makePlayer({ playerId: "p-steam" });
    const guest = makePlayer({
      playerId: "p-guest",
      provider: "guest",
      providerId: "guest-id",
    });

    (await repo.create(steam));
    (await repo.create(guest));

    expect((await repo.findByProvider("steam", STEAM_ID_A))).toEqual(steam);
    expect((await repo.findByProvider("guest", "guest-id"))).toEqual(guest);
  });
});

describe("createMemoryTokenRepo", () => {
  it("stores a token and finds it by hash", async () => {
    const repo = createMemoryTokenRepo();
    const record = makeToken();

    (await repo.create(record));

    expect((await repo.findByHash("hash-1"))).toEqual(record);
  });

  it("returns null for an unknown hash", async () => {
    const repo = createMemoryTokenRepo();

    expect((await repo.findByHash("unknown"))).toBeNull();
  });

  it("allows multiple tokens per player (one per device/launch)", async () => {
    const repo = createMemoryTokenRepo();

    (await repo.create(makeToken({ tokenHash: "hash-1", playerId: "p1" })));
    (await repo.create(makeToken({ tokenHash: "hash-2", playerId: "p1" })));

    expect((await repo.findByHash("hash-1"))?.playerId).toBe("p1");
    expect((await repo.findByHash("hash-2"))?.playerId).toBe("p1");
  });
});
