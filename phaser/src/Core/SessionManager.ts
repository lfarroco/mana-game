import { SessionData } from "./Types";
import { GameLogic } from "./GameLogic";

export class SessionManager {
	private sessions: Map<string, SessionData> = new Map();

	public createSession(playerId: string, crystalId?: string): SessionData {
		const session = GameLogic.createInitialSession(playerId, crystalId);
		this.sessions.set(playerId, session);
		return session;
	}

	public getSession(playerId: string): SessionData | null {
		return this.sessions.get(playerId) || null;
	}

	public updateSession(playerId: string, session: SessionData): void {
		this.sessions.set(playerId, session);
	}

	public deleteSession(playerId: string): void {
		this.sessions.delete(playerId);
	}
}
