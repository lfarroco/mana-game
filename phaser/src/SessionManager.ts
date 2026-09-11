import * as Models from "@game/Models";
import * as SessionManagement from "@game/SessionManagement";
import * as GameConstants from "@game/Constants";
import { createSessionStore, type KeyValueStorage } from "@game/session/sessionStore";
import { formatNumericSeed, sanitizeNumericSeedInput } from "@game/session/seed";
import { GameEvent } from "./Events";

export { STORAGE_PREFIX } from "@game/session/sessionStore";
export const LOCAL_PLAYER_ID = "local_player";

const sessions: Map<string, Models.SessionData> = new Map();

/**
 * Set when the session store could not be read or written. The run keeps
 * playing from memory, but it will not be restored — the UI tells the player
 * once (see `Systems/Storage/persistenceNotice`). Sticky for the app launch:
 * the condition (blocked storage, full quota, read-only profile) does not heal
 * by itself.
 */
let persistenceFailed = false;
let persistenceFailure: { operation: string; detail: string } | null = null;

/** True once any session read/write/remove failed this launch. */
export function hasPersistenceFailed(): boolean {
	return persistenceFailed;
}

/** Details of the first failure (operation + error message), or null. */
export function getPersistenceFailure(): { operation: string; detail: string } | null {
	return persistenceFailure;
}

/**
 * Clear the sticky failure state. Test-only: in the game the flag deliberately
 * survives for the whole app launch (the underlying condition does not heal).
 */
export function resetPersistenceStateForTests(): void {
	persistenceFailed = false;
	persistenceFailure = null;
}

/**
 * Record a storage failure and tell the game once. Emitting here (rather than
 * at each call site) keeps the "not saved" signal to a single source.
 */
function reportPersistenceFailure(operation: string, error: unknown): void {
	console.warn("SessionManager", `Failed to ${operation}`, error);

	const first = !persistenceFailed;
	persistenceFailed = true;
	const detail = error instanceof Error ? error.message : String(error);
	// Keep the first failure: it names the root cause (quota vs policy).
	if (!persistenceFailure) persistenceFailure = { operation, detail };

	// The import-time `loadSessionsFromStorage()` can fail before any listener
	// exists; the notice service reads `hasPersistenceFailed()` on init, so a
	// missed emission is still surfaced.
	if (first) void GameEvent.persistenceUnavailable.emit({ operation, detail });
}

/**
 * localStorage-backed adapter — core never touches localStorage itself.
 *
 * Every access is guarded: the session store is created at module load
 * (`loadSessionsFromStorage()`), and a storage implementation that throws —
 * quota exceeded, storage disabled, a locked-down WebView — would otherwise
 * crash the import (the game never boots) or fail an action after its state was
 * already applied (the choice "saves" but the phase never advances). Saving is
 * best-effort, mirroring `Systems/Storage/LocalStorageProvider`.
 */
const localStorageAdapter: KeyValueStorage = {
	getItem: (key) => {
		try {
			return localStorage.getItem(key);
		} catch (error) {
			reportPersistenceFailure(`read "${key}"`, error);
			return null;
		}
	},
	setItem: (key, value) => {
		try {
			localStorage.setItem(key, value);
		} catch (error) {
			reportPersistenceFailure(`persist "${key}"`, error);
		}
	},
	removeItem: (key) => {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			reportPersistenceFailure(`remove "${key}"`, error);
		}
	},
	keys: () => {
		const keys: string[] = [];
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key !== null) keys.push(key);
			}
		} catch (error) {
			reportPersistenceFailure("enumerate storage keys", error);
		}
		return keys;
	},
};

const sessionStore = createSessionStore(localStorageAdapter);

function loadSessionsFromStorage(): void {
	const loaded = sessionStore.loadAll();
	for (const [playerId, s] of loaded) {
		sessions.set(playerId, s);
	}
}

loadSessionsFromStorage();

export function generateSessionSeed(): string {
	// Numeric-only seeds keep the numpad input and the run-complete display
	// consistent. The session seed is hashed by core's stringToSeed, so any
	// string works — numbers are just the player-facing format.
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const rand = new Uint32Array(1);
		crypto.getRandomValues(rand);
		return formatNumericSeed(rand[0]);
	}
	return formatNumericSeed(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}

export function createSession(
	playerId: string,
	crystalId?: string,
	customSeed?: string
): Models.SessionData {
	// A player-entered seed (numpad input) wins; otherwise generate a fresh
	// numeric seed. Sanitizing keeps the value within the input's 12-digit cap.
	const sanitized = customSeed !== undefined ? sanitizeNumericSeedInput(customSeed) : "";
	const seed = sanitized || generateSessionSeed();
	const session = SessionManagement.createInitialSession(playerId, seed, crystalId);
	sessions.set(playerId, session);
	sessionStore.save(playerId, session);
	return session;
}

export function getSession(playerId: string): Models.SessionData | null {
	return sessions.get(playerId) || null;
}

export function updateSession(playerId: string, session: Models.SessionData): void {
	sessions.set(playerId, session);
	sessionStore.save(playerId, session);
}

export function deleteSession(playerId: string): void {
	sessions.delete(playerId);
	sessionStore.remove(playerId);
}
export const getRemainingLives = (session: Models.SessionData) =>
	GameConstants.STARTING_LIVES - session.losses;
