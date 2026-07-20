import * as LocalServer from "./LocalServer";
import * as RemoteServer from "./RemoteServer";
import { GameServer } from "@game/Models";

export const getServer = (): GameServer => {
	if (state.session.session_type.type === "singleplayer")
		return LocalServer;
	else
		return RemoteServer;
};
