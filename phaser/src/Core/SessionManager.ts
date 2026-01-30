import { SessionData } from "./Types";
import { GameLogic } from "./GameLogic";

const STORAGE_PREFIX = 'mana_session_';

export class SessionManager {
	private sessions: Map<string, SessionData> = new Map();

	constructor() {
		// Load sessions from localStorage on initialization
		this.loadSessionsFromStorage();
	}

	private loadSessionsFromStorage(): void {
		try {
			// Get all session keys from localStorage
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith(STORAGE_PREFIX)) {
					const playerId = key.substring(STORAGE_PREFIX.length);
					const sessionData = localStorage.getItem(key);
					if (sessionData) {
						const session = JSON.parse(sessionData) as SessionData;
						this.sessions.set(playerId, session);
					}
				}
			}
		} catch (error) {
			console.error('[SessionManager] Failed to load sessions from storage:', error);
		}
	}

	private saveSessionToStorage(playerId: string, session: SessionData): void {
		try {
			localStorage.setItem(STORAGE_PREFIX + playerId, JSON.stringify(session));
		} catch (error) {
			console.error('[SessionManager] Failed to save session to storage:', error);
		}
	}

	private removeSessionFromStorage(playerId: string): void {
		try {
			localStorage.removeItem(STORAGE_PREFIX + playerId);
		} catch (error) {
			console.error('[SessionManager] Failed to remove session from storage:', error);
		}
	}

	public createSession(playerId: string, crystalId?: string): SessionData {
		const session = GameLogic.createInitialSession(playerId, crystalId);
		this.sessions.set(playerId, session);
		this.saveSessionToStorage(playerId, session);
		return session;
	}

	public getSession(playerId: string): SessionData | null {
		return this.sessions.get(playerId) || null;
	}

	public updateSession(playerId: string, session: SessionData): void {
		this.sessions.set(playerId, session);
		this.saveSessionToStorage(playerId, session);
	}

	public deleteSession(playerId: string): void {
		this.sessions.delete(playerId);
		this.removeSessionFromStorage(playerId);
	}
}
