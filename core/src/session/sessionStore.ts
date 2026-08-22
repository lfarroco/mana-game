import type { SessionData } from "../types/session";
import type { Unit } from "../types/unit";

export const STORAGE_PREFIX = "mana_session_";

/** Minimal key-value storage contract (injected — core never touches localStorage). */
export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** All keys currently in the store (to enumerate session keys). */
  keys(): string[];
};

/** Convert combatState's unitById Map to an array of entries so JSON.stringify works. */
export function serializeSessionForStorage(session: SessionData): SessionData {
  if (!session.combatState) return session;
  return {
    ...session,
    combatState: {
      ...session.combatState,
      unitById: Array.from(
        session.combatState.unitById.entries(),
      ) as unknown as Map<string, Unit>,
    },
  };
}

/** Reconstruct any Maps that were converted to arrays for JSON storage. */
export function deserializeSessionFromStorage(
  session: SessionData,
): SessionData {
  if (session.combatState && Array.isArray(session.combatState.unitById)) {
    session.combatState.unitById = new Map(
      session.combatState.unitById as unknown as [string, Unit][],
    );
  }
  return session;
}

export type SessionStore = {
  loadAll(): Map<string, SessionData>;
  load(playerId: string): SessionData | null;
  save(playerId: string, session: SessionData): void;
  remove(playerId: string): void;
};

export function createSessionStore(storage: KeyValueStorage): SessionStore {
  const loadAll = (): Map<string, SessionData> => {
    const sessions = new Map<string, SessionData>();
    for (const key of storage.keys()) {
      if (!key.startsWith(STORAGE_PREFIX)) continue;
      const playerId = key.substring(STORAGE_PREFIX.length);
      const raw = storage.getItem(key);
      if (!raw) continue;
      const session = deserializeSessionFromStorage(
        JSON.parse(raw) as SessionData,
      );
      sessions.set(playerId, session);
    }
    return sessions;
  };
  const load = (playerId: string): SessionData | null => {
    const raw = storage.getItem(STORAGE_PREFIX + playerId);
    if (!raw) return null;
    return deserializeSessionFromStorage(JSON.parse(raw) as SessionData);
  };
  const save = (playerId: string, session: SessionData): void => {
    storage.setItem(
      STORAGE_PREFIX + playerId,
      JSON.stringify(serializeSessionForStorage(session)),
    );
  };
  const remove = (playerId: string): void => {
    storage.removeItem(STORAGE_PREFIX + playerId);
  };
  return { loadAll, load, save, remove };
}
