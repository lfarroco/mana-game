import * as Models from "@game/Models";
import * as SessionManagement from "@game/SessionManagement";
import * as GameConstants from "@game/Constants";
import { createSessionStore, type KeyValueStorage } from "@game/session/sessionStore";
import { formatNumericSeed, sanitizeNumericSeedInput } from "@game/session/seed";

export { STORAGE_PREFIX } from "@game/session/sessionStore";
export const LOCAL_PLAYER_ID = "local_player";

const sessions: Map<string, Models.SessionData> = new Map();

// localStorage-backed adapter — core never touches localStorage itself.
const localStorageAdapter: KeyValueStorage = {
	getItem: (key) => localStorage.getItem(key),
	setItem: (key, value) => {
		localStorage.setItem(key, value);
	},
	removeItem: (key) => {
		localStorage.removeItem(key);
	},
	keys: () => {
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key !== null) keys.push(key);
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
