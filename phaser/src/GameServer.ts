import { env } from "@Env";
import * as LocalServer from "./LocalServer";
import { remoteServer } from "./RemoteServer";
import type { GameServer as CoreGameServer } from "@game/types/server";

export type ServerAdapter = CoreGameServer;

/**
 * Pick the server adapter for the current session.
 *
 * Routing is by the server-authored `session_type`:
 *   - `{ type: "multiplayer" }` → the HTTP adapter (the game server owns the run)
 *   - `{ type: "singleplayer" }` → the in-process LocalServer
 *
 * Anything else (a missing/unknown `session_type`) falls back to LocalServer
 * with a warning. The check used to be `type === "singleplayer" ? local :
 * remote`, so a session with a missing/unexpected type silently became
 * **multiplayer**: every action was sent to the game server, failed (no bearer
 * token, or no active server session), and `dispatchAction` restored the phase
 * exit without ever advancing — the run froze with the player's pick already
 * "saved" in client state. That is the reported symptom. `sessionStore` also
 * rejects persisted saves with an unknown type, so this fallback is a belt-and-
 * braces guard for malformed in-memory state rather than a normal path.
 */
export const getServer = (): ServerAdapter => {
	const type = env.state.session?.session_type?.type;

	if (type === "singleplayer") return LocalServer;
	if (type === "multiplayer") return remoteServer;

	// Fail safe: an unrecognised type must never require a network round trip
	// the client cannot satisfy.
	console.warn(
		"GameServer",
		`Unrecognised session_type (${JSON.stringify(
			env.state.session?.session_type
		)}) — falling back to the local server`
	);
	return LocalServer;
};
