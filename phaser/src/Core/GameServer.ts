import { SessionData, PhaseOptions, ActionPayload } from "@Core/Types";

/**
 * Interface for game server implementations.
 * Both LocalServer and RemoteServer implement this interface.
 */
export type GameServer = {

	createSession(playerId: string, crystalId: string): Promise<SessionData>;

	getSession(playerId: string): Promise<SessionData | null>;

	getPhaseOptions(playerId: string): Promise<PhaseOptions>;

	handleAction(playerId: string, actionId: string, payload?: ActionPayload): Promise<boolean>;
}
