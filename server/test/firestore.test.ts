/**
 * Unit tests for the Firestore repositories (`persistence/firestore.ts`).
 *
 * No emulator needed: a small in-memory fake implements the slice of the
 * Admin SDK surface the repos use (collections, documents, batches,
 * single-field queries, `runTransaction`). The fake applies transaction
 * functions directly — it proves repo logic (document layout, combat
 * split, FIFO caps, write-once guards), not Firestore's own concurrency.
 */

/// <reference types="jest" />

import type { Firestore } from "firebase-admin/firestore";
import type { Action } from "@game/types/action";
import {
  createFirestoreRepos,
  type FirestoreRepos,
} from "../src/persistence/firestore";
import {
  createMemoryGhostRepo,
  createMemoryIdempotencyRepo,
  createMemoryPlayerRepo,
  createMemoryPlayerStatsRepo,
  createMemoryRatingRepo,
} from "../src/persistence/memory";
import { createSessionService } from "../src/services/sessionService";

/** Minimal in-memory stand-in for a Firestore document snapshot. */
type FakeSnap = {
  exists: boolean;
  data: () => Record<string, unknown>;
};

class FakeDocRef {
  constructor(
    private readonly store: Map<string, Record<string, unknown>>,
    readonly id: string,
  ) {}

  async get(): Promise<FakeSnap> {
    const data = this.store.get(this.id);
    return {
      exists: data !== undefined,
      data: () => ({ ...(data ?? {}) }),
    };
  }

  async set(data: Record<string, unknown>): Promise<void> {
    this.store.set(this.id, { ...data });
  }

  async update(data: Record<string, unknown>): Promise<void> {
    const current = this.store.get(this.id) ?? {};
    this.store.set(this.id, { ...current, ...data });
  }

  async delete(): Promise<void> {
    this.store.delete(this.id);
  }

  async create(data: Record<string, unknown>): Promise<void> {
    if (this.store.has(this.id)) {
      // Mirror the Admin SDK's ALREADY_EXISTS (gRPC code 6).
      throw Object.assign(new Error("Document already exists"), { code: 6 });
    }
    this.store.set(this.id, { ...data });
  }
}

class FakeQuery {
  private readonly filters: {
    field: string;
    op: string;
    value: unknown;
  }[] = [];

  constructor(private readonly store: Map<string, Record<string, unknown>>) {}

  where(field: string, op: string, value: unknown): FakeQuery {
    this.filters.push({ field, op, value });
    return this;
  }

  async get(): Promise<{ docs: { id: string; data: () => Record<string, unknown> }[] }> {
    const docs: { id: string; data: () => Record<string, unknown> }[] = [];
    for (const [id, data] of this.store) {
      const matches = this.filters.every(({ field, op, value }) => {
        const actual = data[field];
        if (op === "==") return actual === value;
        if (op === ">=" && typeof actual === "number" && typeof value === "number") {
          return actual >= value;
        }
        throw new Error(`unsupported fake operator ${op}`);
      });
      if (matches) docs.push({ id, data: () => ({ ...data }) });
    }
    return { docs };
  }
}

class FakeCollection {
  constructor(private readonly store: Map<string, Record<string, unknown>>) {}

  doc(id: string): FakeDocRef {
    return new FakeDocRef(this.store, id);
  }

  where(field: string, op: string, value: unknown): FakeQuery {
    return new FakeQuery(this.store).where(field, op, value);
  }
}

class FakeBatch {
  private readonly ops: (() => Promise<void>)[] = [];

  set(ref: FakeDocRef, data: Record<string, unknown>): void {
    this.ops.push(() => ref.set(data));
  }

  delete(ref: FakeDocRef): void {
    this.ops.push(() => ref.delete());
  }

  async commit(): Promise<void> {
    for (const op of this.ops) await op();
  }
}

class FakeTransaction {
  get(ref: FakeDocRef): Promise<FakeSnap> {
    return ref.get();
  }
  set(ref: FakeDocRef, data: Record<string, unknown>): void {
    void ref.set(data);
  }
  update(ref: FakeDocRef, data: Record<string, unknown>): void {
    void ref.update(data);
  }
  delete(ref: FakeDocRef): void {
    void ref.delete();
  }
}

class FakeFirestore {
  private readonly collections = new Map<
    string,
    Map<string, Record<string, unknown>>
  >();

  collection(name: string): FakeCollection {
    let store = this.collections.get(name);
    if (!store) {
      store = new Map();
      this.collections.set(name, store);
    }
    return new FakeCollection(store);
  }

  batch(): FakeBatch {
    return new FakeBatch();
  }

  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    return fn(new FakeTransaction());
  }
}

function makeRepos(): FirestoreRepos {
  const db = new FakeFirestore();
  return createFirestoreRepos(db as unknown as Firestore);
}

describe("firestore session repo", () => {
  it("round-trips a session and re-attaches combat state mid-combat", async () => {
    const repos = makeRepos();
    const service = createSessionService(repos.sessionRepo, {
      ghostRepo: createMemoryGhostRepo(),
      ratingRepo: createMemoryRatingRepo(),
      playerRepo: createMemoryPlayerRepo(),
      playerStatsRepo: createMemoryPlayerStatsRepo(),
      idempotencyRepo: createMemoryIdempotencyRepo(),
    });
    const playerId = "fs-player";

    await service.createSession(playerId, { crystalId: "critical_crystal" });
    // Drive to pre_combat, then fight.
    for (let i = 0; i < 50; i++) {
      const current = (await service.getSession(playerId))!;
      if (current.phase === "pre_combat") break;
      const action: Action =
        current.phase === "combat" ? { type: "end_combat" } : { type: "skip" };
      await service.handleAction(playerId, action);
    }
    const fought = await service.handleAction(playerId, {
      type: "start_combat",
    });
    expect(fought.session.phase).toBe("combat");
    expect(fought.combatState).toBeDefined();

    // A fresh read re-attaches the live combat state (Map rebuilt).
    const reloaded = (await repos.sessionRepo.get(playerId))!;
    expect(reloaded.phase).toBe("combat");
    expect(reloaded.combatState?.unitById instanceof Map).toBe(true);
    expect(reloaded.combatState?.wonCombat).toBe(
      fought.combatState?.wonCombat,
    );
  });

  it("returns null for unknown players and deletes session + combat", async () => {
    const repos = makeRepos();
    expect(await repos.sessionRepo.get("nobody")).toBeNull();

    const service = createSessionService(repos.sessionRepo);
    await service.createSession("p1", { crystalId: "mana_crystal" });
    await repos.sessionRepo.delete("p1");
    expect(await repos.sessionRepo.get("p1")).toBeNull();
  });

  it("update() persists the updater result atomically", async () => {
    const repos = makeRepos();
    const service = createSessionService(repos.sessionRepo);
    await service.createSession("p1", { crystalId: "mana_crystal" });

    const result = await repos.sessionRepo.update("p1", (current) => {
      if (!current) throw new Error("expected a session");
      return { session: { ...current, wins: 7 } };
    });

    expect(result.session.wins).toBe(7);
    expect((await repos.sessionRepo.get("p1"))?.wins).toBe(7);
  });

  it("update() hands null to the updater when no session exists", async () => {
    const repos = makeRepos();
    const seen: unknown[] = [];
    await repos.sessionRepo
      .update("ghost", (current) => {
        seen.push(current);
        throw new Error("stop here");
      })
      .catch(() => undefined);
    expect(seen).toEqual([null]);
  });
});

describe("firestore player + token repos", () => {
  it("creates, finds, and upserts players by (provider, providerId)", async () => {
    const repos = makeRepos();
    const player = {
      playerId: "p1",
      provider: "steam" as const,
      providerId: "76561198000000000",
      displayName: "Momo",
      createdAt: 1_752_000_000_000,
    };

    await repos.playerRepo.create(player);
    expect(await repos.playerRepo.findById("p1")).toEqual(player);
    expect(
      await repos.playerRepo.findByProvider("steam", "76561198000000000"),
    ).toEqual(player);

    // Repeat login returns the same player (no duplicate).
    const second = await repos.playerRepo.create({
      ...player,
      playerId: "p2",
    });
    expect(second.playerId).toBe("p1");
    expect(await repos.playerRepo.findById("p2")).toBeNull();
  });

  it("renames players and returns null for unknown ids", async () => {
    const repos = makeRepos();
    expect(
      await repos.playerRepo.updateDisplayName("nobody", "X", 1),
    ).toBeNull();

    await repos.playerRepo.create({
      playerId: "p1",
      provider: "google",
      providerId: "g-1",
      createdAt: 1,
    });
    const updated = await repos.playerRepo.updateDisplayName(
      "p1",
      "Nova",
      2,
    );
    expect(updated?.displayName).toBe("Nova");
    expect(updated?.displayNameUpdatedAt).toBe(2);
  });

  it("stores tokens by hash", async () => {
    const repos = makeRepos();
    expect(await repos.tokenRepo.findByHash("nope")).toBeNull();

    await repos.tokenRepo.create({
      tokenHash: "h1",
      playerId: "p1",
      expiresAt: 10,
      createdAt: 1,
    });
    expect((await repos.tokenRepo.findByHash("h1"))?.playerId).toBe("p1");
  });
});

describe("firestore ghost repo", () => {
  function makeGhost(round: number, createdAt: number) {
    return {
      playerId: `owner-${round}-${createdAt}`,
      sessionId: "s1",
      round,
      team: [],
      rating: 1000,
      createdAt,
    };
  }

  it("finds ghosts by round in insertion order", async () => {
    const repos = makeRepos();
    await repos.ghostRepo.create(makeGhost(2, 30));
    await repos.ghostRepo.create(makeGhost(2, 10));
    await repos.ghostRepo.create(makeGhost(3, 5));

    const round2 = await repos.ghostRepo.findByRound(2);
    expect(round2).toHaveLength(2);
    expect(round2[0].createdAt).toBe(10);
    expect(round2[1].createdAt).toBe(30);
    expect(round2[0].ghostId).not.toBe("");
  });

  it("keeps a capped FIFO of recent opponents", async () => {
    const repos = makeRepos();
    for (let i = 0; i < 25; i++) {
      await repos.ghostRepo.recordMatchup("p1", `opp-${i}`);
    }
    const recent = await repos.ghostRepo.getRecentOpponents("p1");
    expect(recent).toHaveLength(20);
    expect(recent[0]).toBe("opp-5");
    expect(recent[19]).toBe("opp-24");

    // Re-recording moves the opponent to the most-recent end.
    await repos.ghostRepo.recordMatchup("p1", "opp-5");
    const moved = await repos.ghostRepo.getRecentOpponents("p1");
    expect(moved).toHaveLength(20);
    expect(moved[19]).toBe("opp-5");

    expect(await repos.ghostRepo.getRecentOpponents("fresh")).toEqual([]);
  });
});

describe("firestore rating + stats + idempotency repos", () => {
  it("stores one rating per player", async () => {
    const repos = makeRepos();
    expect(await repos.ratingRepo.get("p1")).toBeNull();

    await repos.ratingRepo.upsert({ playerId: "p1", rating: 1000, updatedAt: 1 });
    await repos.ratingRepo.upsert({ playerId: "p1", rating: 1004, updatedAt: 2 });
    expect((await repos.ratingRepo.get("p1"))?.rating).toBe(1004);
  });

  it("pages the leaderboard in rating-DESC order with playerId tiebreak", async () => {
    const repos = makeRepos();
    await repos.ratingRepo.upsert({ playerId: "b", rating: 1000, updatedAt: 1 });
    await repos.ratingRepo.upsert({ playerId: "a", rating: 1000, updatedAt: 1 });
    await repos.ratingRepo.upsert({ playerId: "c", rating: 1200, updatedAt: 1 });

    expect(await repos.ratingRepo.count()).toBe(3);
    expect((await repos.ratingRepo.listTop(2, 0)).map((r) => r.playerId)).toEqual([
      "c",
      "a",
    ]);
    expect((await repos.ratingRepo.listTop(2, 2)).map((r) => r.playerId)).toEqual([
      "b",
    ]);
    expect(await repos.ratingRepo.countAbove(1000, "b")).toBe(2);
    expect(await repos.ratingRepo.countAbove(1200, "c")).toBe(0);
  });

  it("records run completions idempotently and counts windows", async () => {
    const repos = makeRepos();
    const completion = {
      sessionId: "s1",
      playerId: "p1",
      tier: "gold" as const,
      wins: 10,
      completedAt: 100,
    };
    await repos.playerStatsRepo.recordRunCompletion(completion);
    await repos.playerStatsRepo.recordRunCompletion(completion);

    expect(await repos.playerStatsRepo.getVictoryCounts("p1", 0)).toEqual({
      bronze: 0,
      silver: 0,
      gold: 1,
    });
    expect(await repos.playerStatsRepo.getVictoryCounts("p1", 101)).toEqual({
      bronze: 0,
      silver: 0,
      gold: 0,
    });
  });

  it("keeps the first idempotency record per key", async () => {
    const repos = makeRepos();
    expect(await repos.idempotencyRepo.find("p1", "k")).toBeNull();

    const record = {
      playerId: "p1",
      key: "k",
      sessionJson: "{}",
      combatJson: null,
      createdAt: 1,
    };
    await repos.idempotencyRepo.save(record);
    await repos.idempotencyRepo.save({ ...record, sessionJson: '{"other":true}' });

    expect((await repos.idempotencyRepo.find("p1", "k"))?.sessionJson).toBe(
      "{}",
    );
  });
});
