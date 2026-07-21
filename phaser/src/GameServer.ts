import * as LocalServer from "./LocalServer";
import * as RemoteServer from "./RemoteServer";
import * as Models from "@game/Models";
import { ClientState } from "@Models/ClientState";

export type ServerAdapter = {
	createSession(clientState: ClientState, playerId: string, crystalId: string): Promise<Models.SessionData>;
	handleAction(clientState: ClientState, playerId: string, action: Models.Action): Promise<Models.ActionResponse>;
};

export const getServer = (clientState: ClientState): ServerAdapter => {
	if (clientState.session.session_type.type === "singleplayer")
		return LocalServer;
	else
		return RemoteServer;
};
