/**
 * HTTP integration tests for `GET /api/v1/players/ranking` — the paginated
 * rating leaderboard for the multiplayer lobby's ranking tab.
 *
 * Authenticated like players.test.ts (Bearer [REDACTED] via mocked Steam login).
 * Players/ratings are seeded directly into the injected memory repos; the
 * viewer is the Steam-login player. Asserts leaderboard order (rating DESC,
 * playerId ASC tiebreak), 20-per-page pagination, the viewer's own rank
 * (rated and unrated), display-name fallback, and query validation.
 */
/// <reference types="jest" />

import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import {
  createMemoryPlayerRepo,
  createMemoryRatingRepo,
} from "../src/persistence/memory";
import type {
  PlayerRepo,
  RatingRepo,
} from "../src/persistence/repositories";
import { STEAM_IDENTITY } from "../src/services/steamAuth";
import { DEFAULT_PLAYER_RATING } from "../src/services/rating";

const KEY = "test-publisher-key";
const APP_IDS = [3757600, 4233280];
const TICKET = "aaaa";
const STEAM_ID = "76561198000000001";

/** Mock Steam Web API: any ticket resolves to the one steam account. */
const steamFetch = (async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    response: { params: { result: "OK", steamid: STEAM_ID } },
  }),
})) as unknown as typeof fetch;

let playerRepo: PlayerRepo;
let ratingRepo: RatingRepo;
let app: Express;

beforeEach(() => {
  playerRepo = createMemoryPlayerRepo();
  ratingRepo = createMemoryRatingRepo();
  app = createApp({
    playerRepo,
    ratingRepo,
    steam: { webApiKey: KEY, appIds: APP_IDS },
    steamFetch,
  });
});

async function login(): Promise<{ token: string; playerId: string }> {
  const res = await request(app)
    .post("/api/v1/auth/steam")
    .send({ ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 });
  expect(res.status).toBe(200);
  return {
    token: res.body.token as string,
    playerId: res.body.player.playerId as string,
  };
}

/** Seed a rated opponent directly (bypasses auth — one per provider id). */
async function seedPlayer(
  playerId: string,
  rating: number,
  displayName?: string,
): Promise<void> {
  await playerRepo.create({
    playerId,
    provider: "steam",
    providerId: `steam-${playerId}`,
    displayName,
    createdAt: 1,
  });
  await ratingRepo.upsert({ playerId, rating, updatedAt: 1 });
}

/** Leaderboard order: rating DESC, playerId ASC tiebreak. */
function leaderboardOrder(
  rows: { playerId: string; rating: number }[],
): { playerId: string; rating: number }[] {
  return [...rows].sort(
    (a, b) => b.rating - a.rating || (a.playerId < b.playerId ? -1 : 1),
  );
}

describe("GET /api/v1/players/ranking", () => {
  it("returns the first page (20 rows) in leaderboard order with the viewer's rank", async () => {
    const { token, playerId: viewer } = await login();
    await ratingRepo.upsert({ playerId: viewer, rating: 1010, updatedAt: 1 });

    // 24 opponents: ratings spread above/below the viewer, with a tie pair.
    const ratings = [
      1150, 1120, 1100, 1080, 1050, 1050, 1030, 1020, 1015, 1010, 1005, 1000,
      990, 980, 970, 960, 950, 940, 930, 920, 910, 900, 890, 880,
    ];
    for (let i = 0; i < ratings.length; i++) {
      await seedPlayer(`opp-${String(i).padStart(2, "0")}`, ratings[i], `Player ${i}`);
    }

    const res = await request(app)
      .get("/api/v1/players/ranking")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    const body = res.body as {
      entries: { rank: number; playerId: string; displayName: string; rating: number }[];
      page: number;
      pageSize: number;
      totalPlayers: number;
      totalPages: number;
      yourRank: number;
      yourRating: number;
    };
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
    expect(body.totalPlayers).toBe(25);
    expect(body.totalPages).toBe(2);
    expect(body.yourRating).toBe(1010);
    expect(body.entries).toHaveLength(20);

    const expected = leaderboardOrder([
      { playerId: viewer, rating: 1010 },
      ...ratings.map((rating, i) => ({
        playerId: `opp-${String(i).padStart(2, "0")}`,
        rating,
      })),
    ]);
    expect(body.entries.map((e) => e.playerId)).toEqual(
      expected.slice(0, 20).map((e) => e.playerId),
    );
    expect(body.entries.map((e) => e.rank)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    expect(body.yourRank).toBe(
      expected.findIndex((e) => e.playerId === viewer) + 1,
    );
    // Names resolve through the player repo.
    expect(body.entries[0].displayName).toBe("Player 0");
  });

  it("returns later pages with continuing ranks", async () => {
    const { token, playerId: viewer } = await login();
    await ratingRepo.upsert({ playerId: viewer, rating: 1010, updatedAt: 1 });
    for (let i = 0; i < 24; i++) {
      await seedPlayer(`opp-${String(i).padStart(2, "0")}`, 900 + i, `Player ${i}`);
    }

    const res = await request(app)
      .get("/api/v1/players/ranking?page=2")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(5);
    expect(res.body.entries.map((e: { rank: number }) => e.rank)).toEqual([
      21, 22, 23, 24, 25,
    ]);
    expect(res.body.page).toBe(2);
  });

  it("honors an explicit pageSize and rejects invalid query values", async () => {
    const { token } = await login();

    const small = await request(app)
      .get("/api/v1/players/ranking?pageSize=5")
      .set("Authorization", `Bearer ${token}`);
    expect(small.status).toBe(200);
    expect(small.body.pageSize).toBe(5);
    expect(small.body.totalPages).toBe(1);

    for (const query of ["?page=0", "?page=-2", "?page=abc", "?pageSize=0", "?pageSize=51", "?pageSize=xyz"]) {
      const res = await request(app)
        .get(`/api/v1/players/ranking${query}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_request");
    }
  });

  it("ranks a viewer with no rating row at the default rating", async () => {
    const { token } = await login();
    // Two rated opponents straddle the default rating.
    await seedPlayer("opp-high", DEFAULT_PLAYER_RATING + 50, "High");
    await seedPlayer("opp-low", DEFAULT_PLAYER_RATING - 50, "Low");

    const res = await request(app)
      .get("/api/v1/players/ranking")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // The viewer counts toward the total even without a rating row.
    expect(res.body.totalPlayers).toBe(3);
    expect(res.body.yourRating).toBe(DEFAULT_PLAYER_RATING);
    expect(res.body.yourRank).toBe(2);
    expect(res.body.entries).toHaveLength(2);
  });

  it("falls back to the provider id when a player has no display name, breaking ties by player id", async () => {
    const { token } = await login();
    await seedPlayer("aaa-tie", 1000);
    await seedPlayer("zzz-tie", 1000, "Named");

    const res = await request(app)
      .get("/api/v1/players/ranking?pageSize=50")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const entries = res.body.entries as {
      playerId: string;
      displayName: string;
      rating: number;
    }[];
    const tied = entries.filter((e) => e.rating === 1000);
    expect(tied.map((e) => e.playerId)).toEqual(["aaa-tie", "zzz-tie"]);
    expect(tied[0].displayName).toBe("steam-aaa-tie");
    expect(tied[1].displayName).toBe("Named");
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/v1/players/ranking");
    expect(res.status).toBe(401);
  });
});
