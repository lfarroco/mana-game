import { GameServer } from "@Core/GameServer";
import { LocalServer } from "@Core/LocalServer";
import { RemoteServer } from "@Core/RemoteServer";

// TODO: move this to GameServer

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
