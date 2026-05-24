import { SessionData, PhaseOptions, ActionPayload } from "@Core/Types";
import { LocalServer } from "./LocalServer";
import { RemoteServer } from "./RemoteServer";

/**
 * Interface for game server implementations.
 * Both LocalServer and RemoteServer implement this interface.
 */
export type GameServer = {

	createSession(playerId: string, crystalId: string): Promise<SessionData>;

	getSession(playerId: string): Promise<SessionData | null>;

	getPhaseOptions(playerId: string): Promise<PhaseOptions>;

	handleAction(playerId: string, actionId: string, payload?: ActionPayload): Promise<boolean>;
}// TODO: move this to GameServer
type ServerFactoryApi = {
	getServer: () => GameServer;
};
let instance: GameServer | null = null;
const getServer = (): GameServer => {
	if (!instance) {
		instance = state.session.session_type.type === "singleplayer" ?
			new LocalServer() :
			new RemoteServer();
	}
	return instance;
};

export const ServerFactory: ServerFactoryApi = {
	getServer,
};

export function getServerAdapter(): GameServer {
	return getServer();
}

