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

  it("loadAll returns only mana_session_-prefixed keys", () => {
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
