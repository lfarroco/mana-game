import * as Types from "@Core/Types";
import * as GameLogic from "@Core/GameLogic";

const STORAGE_PREFIX = "mana_session_";

const sessions: Map<string, Types.SessionData> = new Map();

loadSessionsFromStorage();

function loadSessionsFromStorage(): void {
	// Get all session keys from localStorage
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && key.startsWith(STORAGE_PREFIX)) {
			const playerId = key.substring(STORAGE_PREFIX.length);
			const sessionData = localStorage.getItem(key);
			if (sessionData) {
				const session = JSON.parse(sessionData) as Types.SessionData;
				sessions.set(playerId, session);
			}
		}
	}
}

function saveSessionToStorage(playerId: string, session: Types.SessionData): void {
	localStorage.setItem(
		STORAGE_PREFIX + playerId,
		JSON.stringify(session),
	);
}

function removeSessionFromStorage(playerId: string): void {
	localStorage.removeItem(STORAGE_PREFIX + playerId);
}

export function createSession(playerId: string, crystalId?: string): Types.SessionData {
	const session = GameLogic.createInitialSession(playerId, crystalId);
	sessions.set(playerId, session);
	saveSessionToStorage(playerId, session);
	return session;
}

export function getSession(playerId: string): Types.SessionData | null {
	return sessions.get(playerId) || null;
}

export function updateSession(playerId: string, session: Types.SessionData): void {
	sessions.set(playerId, session);
	saveSessionToStorage(playerId, session);
}

export function deleteSession(playerId: string): void {
	sessions.delete(playerId);
	removeSessionFromStorage(playerId);
}
export const getRemainingLives = (session: Types.SessionData) => 4 - session.losses;
