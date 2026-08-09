import * as Models from "@game/Models";
import * as SessionManagement from "@game/SessionManagement";
import * as GameConstants from "@game/Constants";

export const STORAGE_PREFIX = "mana_session_";
export const LOCAL_PLAYER_ID = "local_player";

const sessions: Map<string, Models.SessionData> = new Map();

loadSessionsFromStorage();

function generateSessionSeed(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Convert combatState's Map (unitById) to an array of entries so JSON.stringify works.
 */
function prepareSessionForStorage(session: Models.SessionData): Models.SessionData {
	if (!session.combatState) return session;
	return {
		...session,
		combatState: {
			...session.combatState,
			unitById: Array.from(session.combatState.unitById.entries()) as unknown as Map<
				string,
				Models.Unit
			>,
		},
	};
}

/**
 * Reconstruct any Maps that were converted to arrays for JSON storage.
 */
function restoreSessionFromStorage(session: Models.SessionData): void {
	if (session.combatState && Array.isArray(session.combatState.unitById)) {
		session.combatState.unitById = new Map(
			session.combatState.unitById as unknown as [string, Models.Unit][]
		);
	}
}

function loadSessionsFromStorage(): void {
	// Get all session keys from localStorage
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && key.startsWith(STORAGE_PREFIX)) {
			const playerId = key.substring(STORAGE_PREFIX.length);
			const sessionData = localStorage.getItem(key);
			if (sessionData) {
				const session = JSON.parse(sessionData) as Models.SessionData;
				restoreSessionFromStorage(session);
				sessions.set(playerId, session);
			}
		}
	}
}

function saveSessionToStorage(playerId: string, session: Models.SessionData): void {
	localStorage.setItem(
		STORAGE_PREFIX + playerId,
		JSON.stringify(prepareSessionForStorage(session))
	);
}

function removeSessionFromStorage(playerId: string): void {
	localStorage.removeItem(STORAGE_PREFIX + playerId);
}

export function createSession(playerId: string, crystalId?: string): Models.SessionData {
	const seed = generateSessionSeed();
	const session = SessionManagement.createInitialSession(playerId, seed, crystalId);
	sessions.set(playerId, session);
	saveSessionToStorage(playerId, session);
	return session;
}

export function getSession(playerId: string): Models.SessionData | null {
	return sessions.get(playerId) || null;
}

export function updateSession(playerId: string, session: Models.SessionData): void {
	sessions.set(playerId, session);
	saveSessionToStorage(playerId, session);
}

export function deleteSession(playerId: string): void {
	sessions.delete(playerId);
	removeSessionFromStorage(playerId);
}
export const getRemainingLives = (session: Models.SessionData) =>
	GameConstants.STARTING_LIVES - session.losses;
