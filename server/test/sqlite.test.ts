/**
 * SQLite persistence tests — Phase 4 durable persistence (docs/game-server.md).
 *
 * - Repo round-trips: every repository interface against a `:memory:` database
 *   (schema idempotence, prepared-statement behavior, memory-parity semantics).
 * - Restart survival: write to a temp FILE through the full HTTP flow, close
 *   the Database, then reopen a fresh Database + repos on the same file and
 *   assert the player/token/session/ghost/rating state — including a
 *   mid-combat session — is still there. This is the Phase 4 exit criterion:
 *   "kill/restart the server mid-run → GET /sessions/current resumes".
 */
/// <reference types="jest" />

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import {
  createSqliteGhostRepo,
  createSqlitePlayerRepo,
  createSqliteRatingRepo,
  createSqliteRepos,
  createSqliteSessionRepo,
  createSqliteTokenRepo,
  openSqliteDatabase,
  type SqliteRepos,
} from "../src/persistence/sqlite";
import type {
  NewGhost,
  Player,
  Rating,
  TokenRecord,
} from "../src/persistence/repositories";
import { createSessionService } from "../src/services/sessionService";
import { STEAM_IDENTITY } from "../src/services/steamAuth";
import type { Unit } from "@game/types/unit";

const KEY = "test-publisher-key";
const APP_IDS = [3757600, 4233280];
const STEAM_ID_A = "76561198000000000";
const TICKET = "deadbeef";

/** Mock Steam Web API: any ticket resolves to STEAM_ID_A. */
const steamFetch = (async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    response: { params: { result: "OK", steamid: STEAM_ID_A } },
  }),
})) as unknown as typeof fetch;

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

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: "unit-1",
    cardId: "mana_crystal",
    pic: "mana_crystal",
    force: "PLAYER",
    position: [1, 1],
    rank: 1,
    power: 5,
    bonusPower: 0,
    life: 50,
    maxLife: 50,
    shield: 0,
    cooldown: 3,
    evade: 0,
    effects: [],
    reactions: [],
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
    isCore: true,
    ...overrides,
  };
}

describe("sqlite schema", () => {
  it("creates the schema idempotently", () => {
    const db = openSqliteDatabase(":memory:");
    // Both calls must be no-ops after the first (CREATE TABLE IF NOT EXISTS).
    expect(() => openSqliteDatabase(":memory:")).not.toThrow();
    expect(() => createSqliteRepos(db)).not.toThrow();
    db.close();
  });
});

describe("createSqliteSessionRepo", () => {
  it("round-trips a session and re-attaches a combat state with the Map rebuilt", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqliteSessionRepo(db);
    const service = createSessionService(repo);

    service.createSession("p1", { crystalId: "critical_crystal" });
    service.handleAction("p1", { type: "skip" });
    service.handleAction("p1", { type: "skip" });
    const result = service.handleAction("p1", { type: "start_combat" });

    expect(result.session.phase).toBe("combat");
    expect(result.combatState).toBeDefined();

    // The stored session comes back with the live combat state re-attached.
    const resumed = repo.get("p1")!;
    expect(resumed.phase).toBe("combat");
    expect(resumed.combatState).toBeDefined();
    // The derived Map index survives the SQLite round-trip.
    expect(resumed.combatState!.unitById).toBeInstanceOf(Map);
    expect(resumed.combatState!.unitById.size).toBeGreaterThan(0);
    // The wire DTO serialized after the round-trip matches the original.
    expect(resumed.combatState!.enemyPlayerName).toBe(
      result.combatState!.enemyPlayerName,
    );
    expect(resumed.combatState!.logs).toEqual(result.combatState!.logs);
    expect(resumed.combatState!.wonCombat).toBe(result.combatState!.wonCombat);
    expect(resumed.id).toBe(result.session.id);

    // end_combat transitions out of combat; the stale combat row is not read.
    service.handleAction("p1", { type: "end_combat" });
    const next = repo.get("p1")!;
    expect(next.phase).toBe("encounter");
    expect(next.combatState).toBeUndefined();

    db.close();
  });

  it("returns null for unknown players and deletes session + combat state", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqliteSessionRepo(db);

    expect(repo.get("nobody")).toBeNull();

    const session = createSessionService(repo).createSession("p1", {
      crystalId: "critical_crystal",
    });
    session.phase = "combat";
    session.combatState = {
      units: [makeUnit()],
      logs: [],
      enemyPlayerName: "PvE",
      wonCombat: true,
      finalPlayerUnits: [makeUnit()],
      initialUnits: [makeUnit()],
      unitById: new Map(),
      playerCore: makeUnit(),
      cpuCore: makeUnit(),
      playerUnits: [makeUnit()],
      cpuUnits: [makeUnit()],
    };
    repo.upsert("p1", session);
    expect(repo.get("p1")!.combatState).toBeDefined();

    repo.delete("p1");
    expect(repo.get("p1")).toBeNull();

    db.close();
  });
});

function makeGhost(overrides: Partial<NewGhost> = {}): NewGhost {
  return {
    playerId: "player-uuid",
    sessionId: "session-uuid",
    round: 1,
    team: [makeUnit()],
    rating: 1000,
    createdAt: 1_752_000_000_000,
    ...overrides,
  };
}

describe("createSqlitePlayerRepo", () => {
  it("round-trips a player and enforces UNIQUE(provider, provider_id)", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqlitePlayerRepo(db);
    const player = makePlayer();

    repo.create(player);

    expect(repo.findById(player.playerId)).toEqual(player);
    expect(repo.findByProvider("steam", STEAM_ID_A)).toEqual(player);

    // Repeat login (same steam account) returns the existing player.
    const secondAttempt = repo.create(makePlayer({ playerId: "player-2" }));
    expect(secondAttempt).toEqual(player);
    expect(repo.findById("player-2")).toBeNull();

    expect(repo.findById("nobody")).toBeNull();
    expect(repo.findByProvider("steam", "76561198000009999")).toBeNull();

    db.close();
  });

  it("treats distinct steam accounts and distinct providers as distinct players", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqlitePlayerRepo(db);

    const momo = makePlayer({ playerId: "p-1", providerId: STEAM_ID_A });
    const other = makePlayer({ playerId: "p-2", providerId: "76561198000000001" });
    const guest = makePlayer({
      playerId: "p-3",
      provider: "guest",
      providerId: "guest-id",
    });

    repo.create(momo);
    repo.create(other);
    repo.create(guest);

    expect(repo.findById("p-1")).toEqual(momo);
    expect(repo.findById("p-2")).toEqual(other);
    expect(repo.findById("p-3")).toEqual(guest);

    db.close();
  });

  it("stores players without a display name (nullable column)", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqlitePlayerRepo(db);
    const anonymous = makePlayer({ displayName: undefined });

    repo.create(anonymous);

    expect(repo.findById(anonymous.playerId)).toEqual(anonymous);

    db.close();
  });
});

describe("createSqliteTokenRepo", () => {
  it("stores a token and finds it by hash", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqliteTokenRepo(db);
    const record = makeToken();

    repo.create(record);

    expect(repo.findByHash("hash-1")).toEqual(record);
    expect(repo.findByHash("unknown")).toBeNull();

    db.close();
  });

  it("allows multiple tokens per player (one per device/launch)", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqliteTokenRepo(db);

    repo.create(makeToken({ tokenHash: "hash-1", playerId: "p1" }));
    repo.create(makeToken({ tokenHash: "hash-2", playerId: "p1" }));

    expect(repo.findByHash("hash-1")?.playerId).toBe("p1");
    expect(repo.findByHash("hash-2")?.playerId).toBe("p1");

    db.close();
  });
});



describe("createSqliteGhostRepo", () => {
  it("round-trips ghosts (team as JSON) and finds them by round", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqliteGhostRepo(db);

    const ghost = repo.create(makeGhost());
    expect(ghost.ghostId).not.toBe("");

    const roundOne = repo.findByRound(1);
    expect(roundOne).toEqual([ghost]);
    // The team array is JSON round-tripped, not aliased.
    expect(roundOne[0].team).toEqual(makeGhost().team);
    expect(repo.findByRound(2)).toEqual([]);

    db.close();
  });

  it("caps the recently-fought list at 20 (FIFO, oldest first)", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqliteGhostRepo(db);

    for (let i = 0; i < 25; i++) {
      repo.recordMatchup("p1", `opp-${i}`);
    }

    const opponents = repo.getRecentOpponents("p1");
    expect(opponents).toHaveLength(20);
    expect(opponents[0]).toBe("opp-5"); // oldest kept (25 - 20)
    expect(opponents[19]).toBe("opp-24"); // most recent at the end
    expect(repo.getRecentOpponents("nobody")).toEqual([]);

    db.close();
  });

  it("moves a re-recorded opponent to the most-recent end", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqliteGhostRepo(db);

    for (let i = 0; i < 20; i++) {
      repo.recordMatchup("p1", `opp-${i}`);
    }
    repo.recordMatchup("p1", "opp-10"); // already in the list

    const opponents = repo.getRecentOpponents("p1");
    expect(opponents).toHaveLength(20);
    expect(opponents[19]).toBe("opp-10");
    expect(opponents.filter((id) => id === "opp-10")).toHaveLength(1); // moved, not duplicated
    expect(opponents[18]).toBe("opp-19");

    db.close();
  });

  it("keeps recently-fought lists isolated per player", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqliteGhostRepo(db);

    repo.recordMatchup("p1", "opp-a");
    repo.recordMatchup("p2", "opp-b");

    expect(repo.getRecentOpponents("p1")).toEqual(["opp-a"]);
    expect(repo.getRecentOpponents("p2")).toEqual(["opp-b"]);

    db.close();
  });
});

describe("createSqliteRatingRepo", () => {
  it("round-trips a rating and updates in place", () => {
    const db = openSqliteDatabase(":memory:");
    const repo = createSqliteRatingRepo(db);

    expect(repo.get("p1")).toBeNull();

    const first: Rating = { playerId: "p1", rating: 1000, updatedAt: 111 };
    repo.upsert(first);
    expect(repo.get("p1")).toEqual(first);

    const second: Rating = { playerId: "p1", rating: 1006, updatedAt: 222 };
    repo.upsert(second);
    expect(repo.get("p1")).toEqual(second);

    db.close();
  });
});

describe("createApp with SQLite persistence", () => {
  it("boots with SQLite when sqlitePath is set (:memory:)", async () => {
    const app = createApp({
      sqlitePath: ":memory:",
      steam: { webApiKey: KEY, appIds: APP_IDS },
      steamFetch,
    });

    const res = await request(app)
      .post("/api/v1/auth/steam")
      .send({ ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 });
    expect(res.status).toBe(200);

    const create = await request(app)
      .post("/api/v1/sessions")
      .set("Authorization", `Bearer ${res.body.token as string}`)
      .send({ crystalId: "critical_crystal" });
    expect(create.status).toBe(201);
    expect(create.body.phase).toBe("encounter");
  });
});


describe("restart survival", () => {
  /**
   * The Phase 4 exit criterion: write through the full HTTP flow to a temp
   * FILE, close the Database (the "kill"), reopen a fresh Database + repos on
   * the same file (the "restart"), and assert the whole player/token/session/
   * ghost/rating state — including a mid-combat session — is still there.
   */
  it("resumes a mid-combat session after close + reopen of the same file", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "mana-sqlite-"));
    const dbPath = path.join(dir, "mana.db");

    try {
      // --- "boot 1": SQLite repos on a temp file, full HTTP flow into combat ---
      const first = sqliteApp(dbPath);
      const login = await request(first.app)
        .post("/api/v1/auth/steam")
        .send({ ticket: TICKET, identity: STEAM_IDENTITY, appId: 3757600 });
      expect(login.status).toBe(200);
      const { token, player } = login.body as {
        token: string;
        player: { playerId: string };
      };

      await request(first.app)
        .post("/api/v1/sessions")
        .set("Authorization", `Bearer ${token}`)
        .send({ crystalId: "critical_crystal" });

      const started = await driveToCombat(first.app, token);
      expect(started.body.session.phase).toBe("combat");
      expect(started.body.combatState).toBeDefined();

      // Side tables written by the flow: ghost snapshot + default rating.
      expect(first.repos.ghostRepo.findByRound(1)).toHaveLength(1);
      expect(first.repos.ratingRepo.get(player.playerId)?.rating).toBe(1000);

      // --- "kill": close the database connection ---
      first.db.close();

      // --- "restart": fresh Database + fresh repos on the same file ---
      const second = sqliteApp(dbPath);

      // Player identity, rating, ghost snapshot survived.
      expect(
        second.repos.playerRepo.findById(player.playerId)?.providerId,
      ).toBe(STEAM_ID_A);
      expect(second.repos.ratingRepo.get(player.playerId)?.rating).toBe(1000);
      expect(second.repos.ghostRepo.findByRound(1)).toHaveLength(1);

      // The ORIGINAL bearer token still authenticates (hash stored durably).
      const resumed = await request(second.app)
        .get("/api/v1/sessions/current")
        .set("Authorization", `Bearer ${token}`);
      expect(resumed.status).toBe(200);
      expect(resumed.body.phase).toBe("combat");
      // Resume payload is byte-identical to the pre-restart combat state.
      expect(resumed.body.combatState).toEqual(started.body.combatState);

      // The run can CONTINUE after the restart: end_combat works.
      const after = await request(second.app)
        .post("/api/v1/sessions/current/actions")
        .set("Authorization", `Bearer ${token}`)
        .send({ action: { type: "end_combat" } });
      expect(after.status).toBe(200);
      expect(after.body.session.phase).toBe("encounter");
      expect(after.body.session.round).toBe(2);

      second.db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/** App + sqlite repos over one Database on the given path. */
function sqliteApp(dbPath: string): {
  app: Express;
  db: ReturnType<typeof openSqliteDatabase>;
  repos: SqliteRepos;
} {
  const db = openSqliteDatabase(dbPath);
  const repos = createSqliteRepos(db);
  const app = createApp({
    repo: repos.sessionRepo,
    playerRepo: repos.playerRepo,
    tokenRepo: repos.tokenRepo,
    ghostRepo: repos.ghostRepo,
    ratingRepo: repos.ratingRepo,
    steam: { webApiKey: KEY, appIds: APP_IDS },
    steamFetch,
  });
  return { app, db, repos };
}

/** Create a session, skip to pre_combat, start_combat, and return the result. */
async function driveToCombat(app: Express, token: string) {
  let res = await request(app)
    .post("/api/v1/sessions/current/actions")
    .set("Authorization", `Bearer ${token}`)
    .send({ action: { type: "skip" } });
  for (let i = 0; i < 10 && res.body.session?.phase !== "pre_combat"; i++) {
    res = await request(app)
      .post("/api/v1/sessions/current/actions")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: { type: "skip" } });
  }
  expect(res.body.session.phase).toBe("pre_combat");

  return request(app)
    .post("/api/v1/sessions/current/actions")
    .set("Authorization", `Bearer ${token}`)
    .send({ action: { type: "start_combat" } });
}

