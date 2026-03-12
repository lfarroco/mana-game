import { IGameServer } from "@Core/IGameServer";
import { LocalServerAdapter } from "@Core/LocalServerAdapter";
import { RemoteServerAdapter } from "@Core/RemoteServerAdapter";

type ServerFactoryApi = {
	getServer: () => IGameServer;
	setMultiplayer: (multiplayer: boolean) => void;
	isInMultiplayerMode: () => boolean;
	reset: () => void;
};

let instance: IGameServer | null = null;
let multiplayerMode = false;

const getServer = (): IGameServer => {
	if (!instance) {
		instance = multiplayerMode ? new RemoteServerAdapter() : new LocalServerAdapter();
	}
	return instance;
};

const setMultiplayer = (multiplayer: boolean): void => {
	if (multiplayerMode !== multiplayer) {
		multiplayerMode = multiplayer;
		instance = multiplayer ? new RemoteServerAdapter() : new LocalServerAdapter();
	}
};

const isInMultiplayerMode = (): boolean => multiplayerMode;

const reset = (): void => {
	instance = null;
	multiplayerMode = false;
};

export const ServerFactory: ServerFactoryApi = {
	getServer,
	setMultiplayer,
	isInMultiplayerMode,
	reset,
};

export function getServerAdapter(): IGameServer {
	return getServer();
}
