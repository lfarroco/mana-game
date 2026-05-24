import { SessionData } from "@Core/Types";
import * as GameLogic from "@Core/GameLogic";

const STORAGE_PREFIX = "mana_session_";

const sessions: Map<string, SessionData> = new Map();

loadSessionsFromStorage();

function loadSessionsFromStorage(): void {
	// Get all session keys from localStorage
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && key.startsWith(STORAGE_PREFIX)) {
			const playerId = key.substring(STORAGE_PREFIX.length);
			const sessionData = localStorage.getItem(key);
			if (sessionData) {
				const session = JSON.parse(sessionData) as SessionData;
				sessions.set(playerId, session);
			}
		}
	}
}

function saveSessionToStorage(playerId: string, session: SessionData): void {
	localStorage.setItem(STORAGE_PREFIX + playerId, JSON.stringify(session));
}

function removeSessionFromStorage(playerId: string): void {
	localStorage.removeItem(STORAGE_PREFIX + playerId);
}

export function createSession(playerId: string, crystalId?: string): SessionData {
	const session = GameLogic.createInitialSession(playerId, crystalId);
	sessions.set(playerId, session);
	saveSessionToStorage(playerId, session);
	return session;
}

export function getSession(playerId: string): SessionData | null {
	return sessions.get(playerId) || null;
}

export function updateSession(playerId: string, session: SessionData): void {
	sessions.set(playerId, session);
	saveSessionToStorage(playerId, session);
}

export function deleteSession(playerId: string): void {
	sessions.delete(playerId);
	removeSessionFromStorage(playerId);
}
