import { env } from "@Env";
import * as LocalServer from "./LocalServer";
import * as RemoteServer from "./RemoteServer";
import * as Models from "@game/Models";

export type ServerAdapter = {
	createSession(playerId: string, crystalId: string): Promise<Models.SessionData>;
	handleAction(playerId: string, action: Models.Action): Promise<Models.ActionResponse>;
};

export const getServer = (): ServerAdapter => {
	if (env.state.session.session_type.type === "singleplayer") return LocalServer;
	else return RemoteServer;
};
