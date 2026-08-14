import { env } from "@Env";
import * as LocalServer from "./LocalServer";
import { remoteServer } from "./RemoteServer";
import type { GameServer as CoreGameServer } from "@game/types/server";

export type ServerAdapter = CoreGameServer & {
	/**
	 * Delete the persisted session for a player (e.g. when a run is finished —
	 * victory or game over). Removes the save so the player can't resume a
	 * completed run from the title screen.
	 */
	deleteSession(playerId: string): void | Promise<void>;
};

export const getServer = (): ServerAdapter => {
	if (env.state.session.session_type.type === "singleplayer") return LocalServer;
	else return remoteServer;
};
