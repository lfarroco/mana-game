import { SessionData, PhaseOptions, ActionPayload } from "@Core/Types";
import * as LocalServer from "./LocalServer";
import * as RemoteServer from "./RemoteServer";

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


export const getServer = (): GameServer => {
	if (state.session.session_type.type === "singleplayer")
		return LocalServer;
	else
		return RemoteServer;
};
