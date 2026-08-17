import { env } from "@Env";
import * as LocalServer from "./LocalServer";
import { remoteServer } from "./RemoteServer";
import type { GameServer as CoreGameServer } from "@game/types/server";

export type ServerAdapter = CoreGameServer;

export const getServer = (): ServerAdapter => {
	if (env.state.session.session_type.type === "singleplayer") return LocalServer;
	else return remoteServer;
};
