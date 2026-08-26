import type { SessionData } from "../types/session";
import type { Unit } from "../types/unit";

/**
 * Namespace for persisted single-player sessions.
 *
 * v2 (2026-08-25): bumped from `mana_session_` so saves written by the
 * pre-overhaul engine (all launched builds through mid-2026) are never loaded —
 * the old SessionData shape is incompatible (`current_options` vs `options`, no
 * `session_type`, no `runStats`/`combatState`) and resuming one could crash the
 * game. Legacy keys are swept by `loadAll` on boot. Bump this again whenever
 * the persisted shape breaks; older saves are ignored rather than migrated.
 */
export const STORAGE_PREFIX = "mana_session_v2_";

/** Save namespace used before the 2026 engine overhaul (pre-v2). */
const LEGACY_STORAGE_PREFIX = "mana_session_";

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

/** A save that cannot have come from the current engine is discarded. */
function isPlausibleSession(session: SessionData): boolean {
  return (
    typeof session.id === "string" &&
    typeof session.player_id === "string" &&
    session.player_id !== "" &&
    typeof session.phase === "string" &&
    typeof session.seed === "string" &&
    typeof session.initial_seed === "string" &&
    Array.isArray(session.team?.units)
  );
}

/** Parse + validate a stored save; corrupt/shape-mismatched entries yield null. */
function parseStoredSession(raw: string): SessionData | null {
  try {
    const parsed = JSON.parse(raw) as SessionData;
    const session = deserializeSessionFromStorage(parsed);
    return isPlausibleSession(session) ? session : null;
  } catch {
    return null; // corrupt entry — ignore rather than crash at boot
  }
}

/** Remove save keys written by the pre-v2 engine (incompatible, unmigrated). */
function purgeLegacySessions(storage: KeyValueStorage): void {
  for (const key of storage.keys()) {
    // LEGACY_STORAGE_PREFIX is a prefix of STORAGE_PREFIX, so only keys that
    // match the legacy prefix AND NOT the v2 prefix are stale.
    if (
      key.startsWith(LEGACY_STORAGE_PREFIX) &&
      !key.startsWith(STORAGE_PREFIX)
    ) {
      storage.removeItem(key);
    }
  }
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
      const session = parseStoredSession(raw);
      if (!session) continue;
      sessions.set(playerId, session);
    }
    // One-time sweep of pre-overhaul saves; they can never be resumed safely.
    purgeLegacySessions(storage);
    return sessions;
  };
  const load = (playerId: string): SessionData | null => {
    const raw = storage.getItem(STORAGE_PREFIX + playerId);
    if (!raw) return null;
    return parseStoredSession(raw);
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
