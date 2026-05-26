import { SessionData, PhaseOptions, ActionPayload } from "@Core/Types";
import * as LocalServer from "./LocalServer";
import * as RemoteServer from "./RemoteServer";

/**
 * Interface for game server implementations.
 * Both LocalServer and RemoteServer implement this interface.
 */
export type GameServer = {

	createSession(playerId: string, crystalId: string): Promise<SessionData>;

	// TODO: this might be unecessary (actions update
	// the session in the state)
	getSession(playerId: string): Promise<SessionData | null>;

	// TODO: same as above
	getPhaseOptions(playerId: string): Promise<PhaseOptions>;

	handleAction(playerId: string, actionId: string, payload?: ActionPayload): Promise<SessionData>;
}


export const getServer = (): GameServer => {
	if (state.session.session_type.type === "singleplayer")
		return LocalServer;
	else
		return RemoteServer;
};


// End goal:
// You don’t even need separate LocalServer and RemoteServer gameplay logic.

// Instead:

// GameSimulation

// shared by both.

// Example:

// RemoteServer
//   → wraps GameSimulation over network

// LocalServer
//   → wraps same GameSimulation in-process

// That’s usually the ideal end-state because:

// rules stay identical
// balance stays identical
// desyncs disappear
// multiplayer bugs drop massively

// That’s the architecture used in many RTS, tactics, and simulation-heavy games.
