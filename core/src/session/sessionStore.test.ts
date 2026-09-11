/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as Constants from "../math/Constants";
import * as SessionManagement from "./SessionManagement";
import {
  createSessionStore,
  deserializeSessionFromStorage,
  serializeSessionForStorage,
  STORAGE_PREFIX,
  type KeyValueStorage,
} from "./sessionStore";
import type { SessionData } from "../types/session";
import type { CombatState } from "../types/combat";
import type { Unit } from "../types/unit";

afterAll(() => {
  Card.resetCardsMap();
});

function createSessionWithCombatState(
  playerId: string,
  seed: string,
): SessionData {
  const session = SessionManagement.createInitialSession(playerId, seed);
  const units = [
    Card.makeUnit(Constants.FORCE_ID_PLAYER, "mana_crystal", [1, 1]),
    Card.makeUnit(Constants.FORCE_ID_PLAYER, "mana_crystal", [1, 2]),
  ];
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  session.combatState = {
    units,
    logs: [],
    enemyPlayerName: "TestRival",
    wonCombat: false,
    finalPlayerUnits: [],
    initialUnits: [],
    unitById,
    playerCore: units[0],
    cpuCore: units[1],
    playerUnits: units,
    cpuUnits: [],
  } as unknown as CombatState;
  return session;
}

describe("serializeSessionForStorage / deserializeSessionFromStorage", () => {
  it("round-trips unitById Map → array → Map with the same entries", () => {
    const session = createSessionWithCombatState("p1", "seed-1");
    const originalEntries = Array.from(session.combatState!.unitById.entries());

    const serialized = serializeSessionForStorage(session);
    expect(serialized.combatState!.unitById).toBeInstanceOf(Array);

    // Simulate the JSON storage round-trip.
    const parsed = JSON.parse(JSON.stringify(serialized)) as SessionData;
    const restored = deserializeSessionFromStorage(parsed);

    expect(restored.combatState!.unitById).toBeInstanceOf(Map);
    expect(restored.combatState!.unitById.size).toBe(originalEntries.length);
    for (const [id, unit] of originalEntries) {
      expect(restored.combatState!.unitById.get(id)).toEqual(unit);
    }
  });

  it("leaves a session without combatState untouched", () => {
    const session = SessionManagement.createInitialSession("p1", "seed-1");
    expect(serializeSessionForStorage(session)).toBe(session);
    expect(deserializeSessionFromStorage(session)).toBe(session);
  });
});

describe("createSessionStore", () => {
  const memoryStorage = (): KeyValueStorage => {
    const map = new Map<string, string>();
    return {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => {
        map.set(key, value);
      },
      removeItem: (key) => {
        map.delete(key);
      },
      keys: () => Array.from(map.keys()),
    };
  };
  it("save then load returns an equivalent session with the combatState Map intact", () => {
    const store = createSessionStore(memoryStorage());
    const session = createSessionWithCombatState("p1", "seed-1");
    store.save("p1", session);

    const loaded = store.load("p1")!;
    expect(loaded).not.toBe(session);
    expect(loaded.combatState!.unitById).toBeInstanceOf(Map);
    expect(loaded.combatState!.unitById.size).toBe(
      session.combatState!.unitById.size,
    );
    for (const [id, unit] of session.combatState!.unitById) {
      expect(loaded.combatState!.unitById.get(id)).toEqual(unit);
    }
  });

  it("persists unitById as a plain array in storage", () => {
    const storage = memoryStorage();
    const store = createSessionStore(storage);
    const session = createSessionWithCombatState("p1", "seed-1");
    store.save("p1", session);

    const raw = storage.getItem(STORAGE_PREFIX + "p1")!;
    const stored = JSON.parse(raw) as SessionData;
    expect(Array.isArray(stored.combatState!.unitById)).toBe(true);
  });

  it("remove clears the stored session", () => {
    const storage = memoryStorage();
    const store = createSessionStore(storage);
    store.save("p1", createSessionWithCombatState("p1", "seed-1"));
    store.remove("p1");

    expect(store.load("p1")).toBeNull();
    expect(storage.getItem(STORAGE_PREFIX + "p1")).toBeNull();
  });

  it("loadAll returns only STORAGE_PREFIX-prefixed keys", () => {
    const storage = memoryStorage();
    const store = createSessionStore(storage);
    store.save("p1", createSessionWithCombatState("p1", "seed-1"));
    store.save("p2", SessionManagement.createInitialSession("p2", "seed-2"));
    storage.setItem("other_key", "junk");

    const all = store.loadAll();
    expect(Array.from(all.keys()).sort()).toEqual(["p1", "p2"]);
    expect(all.get("p1")!.combatState!.unitById).toBeInstanceOf(Map);
    expect(all.get("p2")!.combatState).toBeUndefined();
  });

  it("load of a missing player returns null", () => {
    const store = createSessionStore(memoryStorage());
    expect(store.load("missing")).toBeNull();
  });

  it("skips empty values during loadAll", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_PREFIX + "empty", "");
    const store = createSessionStore(storage);

    const all = store.loadAll();
    expect(all.size).toBe(0);
    expect(store.load("empty")).toBeNull();
  });

  it("skips empty values during loadAll", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_PREFIX + "empty", "");
    const store = createSessionStore(storage);

    const all = store.loadAll();
    expect(all.size).toBe(0);
    expect(store.load("empty")).toBeNull();
  });

  it("ignores corrupt JSON saves instead of throwing (boot safety)", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_PREFIX + "p1", "{not valid json");
    const store = createSessionStore(storage);

    expect(store.load("p1")).toBeNull();
    expect(store.loadAll().size).toBe(0);
  });

  it("skips saves that don't match the current session shape", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_PREFIX + "p1", JSON.stringify({ id: "x" }));
    const store = createSessionStore(storage);

    expect(store.load("p1")).toBeNull();
    expect(store.loadAll().size).toBe(0);
  });

  it("loadAll purges pre-v2 legacy saves so they are never resumed", () => {
    const storage = memoryStorage();
    // A save written by the pre-overhaul engine (old namespace + shape).
    storage.setItem(
      "mana_session_local_player",
      JSON.stringify({ current_options: [] }),
    );
    const store = createSessionStore(storage);
    store.save("p2", SessionManagement.createInitialSession("p2", "seed-2"));

    const all = store.loadAll();
    expect(all.has("local_player")).toBe(false);
    expect(all.has("p2")).toBe(true);
    expect(storage.getItem("mana_session_local_player")).toBeNull();
  });

  it("restores unitById Maps for multiple stored sessions", () => {
    const storage = memoryStorage();
    const store = createSessionStore(storage);
    const units: Unit[] = [
      Card.makeUnit(Constants.FORCE_ID_PLAYER, "mana_crystal", [2, 2]),
    ];
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const sessionA = SessionManagement.createInitialSession("a", "seed-a");
    const sessionB = SessionManagement.createInitialSession("b", "seed-b");
    sessionA.combatState = {
      units,
      logs: [],
      enemyPlayerName: "Rival",
      wonCombat: true,
      finalPlayerUnits: [],
      initialUnits: [],
      unitById,
      playerCore: units[0],
      cpuCore: units[0],
      playerUnits: units,
      cpuUnits: [],
    } as unknown as CombatState;
    store.save("a", sessionA);
    store.save("b", sessionB);

    const loaded = store.load("a")!;
    expect(loaded.combatState!.unitById.get(units[0].id)).toEqual(units[0]);
    expect(store.load("b")!.combatState).toBeUndefined();
  });
});

/**
 * A save whose `session_type` is missing/unknown used to pass validation and
 * then broke the run at the first action: the client routes anything that isn't
 * "singleplayer" to the remote server (`phaser/src/GameServer.ts`), so the
 * dispatch failed, the phase exit was restored, and the run froze with the
 * player's pick already applied. Such saves must be discarded at load instead.
 */
describe("createSessionStore save validation (session_type / phase)", () => {
  const memoryStorage = (): KeyValueStorage => {
    const map = new Map<string, string>();
    return {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => {
        map.set(key, value);
      },
      removeItem: (key) => {
        map.delete(key);
      },
      keys: () => Array.from(map.keys()),
    };
  };

  /** Store an arbitrary session-shaped object under the v2 prefix. */
  const storeRaw = (
    session: unknown,
  ): ReturnType<typeof createSessionStore> => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_PREFIX + "p1", JSON.stringify(session));
    return createSessionStore(storage);
  };

  const validSession = () =>
    SessionManagement.createInitialSession("p1", "seed-1");

  it("accepts a well-formed single-player save", () => {
    const store = storeRaw(validSession());
    expect(store.load("p1")).not.toBeNull();
  });

  it("accepts a multiplayer-typed save (server-authored type)", () => {
    const session = validSession();
    session.session_type = { type: "multiplayer", queueType: "casual" };
    expect(storeRaw(session).load("p1")).not.toBeNull();
  });

  it("rejects a save with no session_type", () => {
    const session = validSession() as Partial<SessionData>;
    delete session.session_type;
    expect(storeRaw(session).load("p1")).toBeNull();
  });

  it("rejects a save with an unknown session_type", () => {
    const session = validSession();
    // A third mode the client cannot route (the reported "neither single
    // player nor multiplayer" case).
    session.session_type = {
      type: "practice",
    } as unknown as SessionData["session_type"];
    expect(storeRaw(session).load("p1")).toBeNull();
  });

  it("rejects a save with a null session_type", () => {
    const session = validSession();
    session.session_type = null as unknown as SessionData["session_type"];
    expect(storeRaw(session).load("p1")).toBeNull();
  });

  it("rejects a save whose phase the client cannot render", () => {
    const session = validSession();
    session.phase = "intermission" as unknown as SessionData["phase"];
    expect(storeRaw(session).load("p1")).toBeNull();
  });

  it("rejects a save stuck in the awaken phase without an awaken unit", () => {
    // The client renders nothing without the unit, and `skip` is not allowed in
    // awaken — an unescapable dead end.
    const session = validSession();
    session.phase = "awaken";
    delete session.awakenUnitId;
    expect(storeRaw(session).load("p1")).toBeNull();

    session.awakenUnitId = "unit-1";
    expect(storeRaw(session).load("p1")).not.toBeNull();
  });

  it("rejects a save missing its round/step/options bookkeeping", () => {
    for (const field of ["round", "step", "options"] as const) {
      const session = validSession() as Partial<SessionData>;
      delete session[field];
      expect(storeRaw(session).load("p1")).toBeNull();
    }
  });
});
