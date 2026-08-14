import { env } from "@Env";
import * as LocalServer from "./LocalServer";
import { remoteServer } from "./RemoteServer";
import * as Models from "@game/Models";

export type ServerAdapter = {
	createSession(playerId: string, crystalId: string): Promise<Models.SessionData>;
	handleAction(playerId: string, action: Models.Action): Promise<Models.ActionResponse>;
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
