import * as Types from "@Core/Types";
import * as LocalServer from "./LocalServer";
import * as RemoteServer from "./RemoteServer";

/**
 * Interface for game server implementations.
 * Both LocalServer and RemoteServer implement this interface.
 */
export type GameServer = {

	// TODO: this might not be necessary if we do
	// handleAction("create_session", { crystalId })
	createSession(
		playerId: string,
		crystalId: string,
	): Promise<Types.SessionData>;

	handleAction(
		playerId: string,
		action: Types.Action,
	): Promise<Types.SessionData>;

}

export const getServer = (): GameServer => {
	if (state.session.session_type.type === "singleplayer")
		return LocalServer;
	else
		return RemoteServer;
};
