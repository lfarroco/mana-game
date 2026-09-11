import type { SessionData } from "../types/session";
import { PHASE_TYPES } from "../types/session";
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

/**
 * The two session modes the client can route (phaser `GameServer.getServer`).
 * A save whose `session_type` is missing or unknown used to pass validation,
 * then route every action to the remote server (or throw on `.type`) — the run
 * froze with the pick already applied. Reject such a save at load instead.
 */
function isKnownSessionType(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return type === "singleplayer" || type === "multiplayer";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Structural check for one persisted unit. Only identity/placement — the
 * numbers are rebuilt from the card definition on load (`resetUnitStats`), but
 * a unit without an id, a card or a board position breaks the board sync and
 * the combat index rebuild.
 */
function isPlausibleUnit(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const position = value.position;
  return (
    typeof value.id === "string" &&
    value.id !== "" &&
    typeof value.cardId === "string" &&
    Array.isArray(position) &&
    position.length === 2 &&
    position.every((n) => typeof n === "number")
  );
}

/**
 * A stored mid-combat `CombatState` must carry what playback rebuilds from:
 * the unit list, the pristine `initialUnits` snapshot it swaps in, the log it
 * plays, and `finalPlayerUnits`. A stale/partial one (an older shape) used to
 * load and then throw inside the combat phase — a blank board with the session
 * stuck in `combat`.
 */
function isPlausibleCombatState(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.units) &&
    value.units.every(isPlausibleUnit) &&
    Array.isArray(value.initialUnits) &&
    Array.isArray(value.finalPlayerUnits) &&
    Array.isArray(value.logs)
  );
}

/** Units must have unique ids — duplicate ids collapse the combat `unitById`. */
function hasUniqueUnitIds(units: unknown[]): boolean {
  const ids = units.map((u) => (isRecord(u) ? u.id : undefined));
  return new Set(ids).size === ids.length;
}

/** A save that cannot have come from the current engine is discarded. */
function isPlausibleSession(session: SessionData): boolean {
  const units = session.team?.units;

  return (
    typeof session.id === "string" &&
    typeof session.player_id === "string" &&
    session.player_id !== "" &&
    isKnownSessionType(session.session_type) &&
    typeof session.phase === "string" &&
    // Every phase the client can render (see PHASE_TYPES): a phase the client
    // does not declare used to load and then silently no-op in the phase
    // controller, leaving the session advanced and the screen frozen.
    (PHASE_TYPES as readonly string[]).includes(session.phase) &&
    // The awaken phase has no UI without the unit being awakened (the client
    // renders nothing and `skip` is not allowed there), so a save missing it
    // would be an unescapable dead end.
    (session.phase !== "awaken" || typeof session.awakenUnitId === "string") &&
    typeof session.round === "number" &&
    typeof session.step === "number" &&
    Array.isArray(session.options) &&
    typeof session.seed === "string" &&
    typeof session.initial_seed === "string" &&
    Array.isArray(units) &&
    units.every(isPlausibleUnit) &&
    hasUniqueUnitIds(units) &&
    // A save parked in the combat phase with no playable combat state cannot
    // resume (`CombatPhase` throws "Missing combatState"), and any combat state
    // that IS attached must be playable.
    (session.phase !== "combat" ||
      isPlausibleCombatState(session.combatState)) &&
    (session.combatState === undefined ||
      isPlausibleCombatState(session.combatState))
  );
}

/**
 * Parse + validate a stored save; corrupt/shape-mismatched entries yield null.
 * The reason is logged (key + failure) so a support case can tell "the game
 * discarded an incompatible save" apart from "the game lost the save" — players
 * used to work this out by clearing their cache.
 */
function parseStoredSession(raw: string, key: string): SessionData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn("sessionStore", `Discarding unreadable save "${key}"`, error);
    return null;
  }

  try {
    const session = deserializeSessionFromStorage(parsed as SessionData);
    if (!isPlausibleSession(session)) {
      console.warn(
        "sessionStore",
        `Discarding incompatible save "${key}" — it was written by another ` +
          `engine/build (phase, session type, units or combat state don't match)`,
      );
      return null;
    }
    return session;
  } catch (error) {
    console.warn("sessionStore", `Discarding malformed save "${key}"`, error);
    return null;
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
      const session = parseStoredSession(raw, key);
      if (!session) continue;
      sessions.set(playerId, session);
    }
    // One-time sweep of pre-overhaul saves; they can never be resumed safely.
    purgeLegacySessions(storage);
    return sessions;
  };
  const load = (playerId: string): SessionData | null => {
    const key = STORAGE_PREFIX + playerId;
    const raw = storage.getItem(key);
    if (!raw) return null;
    return parseStoredSession(raw, key);
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
