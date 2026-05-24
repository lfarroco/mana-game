import { GameServer } from "@Core/GameServer";
import { LocalServerAdapter } from "@Core/LocalServerAdapter";
import { RemoteServerAdapter } from "@Core/RemoteServerAdapter";

type ServerFactoryApi = {
	getServer: () => GameServer;
};

let instance: GameServer | null = null;

const getServer = (): GameServer => {
	if (!instance) {
		instance = state.session.session_type.type === "singleplayer" ?
			new LocalServerAdapter() :
			new RemoteServerAdapter();
	}
	return instance;
};

export const ServerFactory: ServerFactoryApi = {
	getServer,
};

export function getServerAdapter(): GameServer {
	return getServer();
}
