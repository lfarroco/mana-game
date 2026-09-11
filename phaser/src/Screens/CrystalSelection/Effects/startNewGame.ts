import { getSelection } from "../selection";
import * as LocalServer from "../../../LocalServer";
import { remoteServer } from "../../../RemoteServer";
import { env } from "@Env";
import { go } from "@Scenes/AppRouter";
import { LOCAL_PLAYER_ID } from "../../../SessionManager";
import { isMultiplayerMode } from "@lib/multiplayerMode";

export const startNewGame = async () => {
	const { crystals, currentIndex } = getSelection();
	const selectedCrystal = crystals[currentIndex];

	// Multiplayer mode (arena entry): the server generates the seed and owns
	// the session; single-player keeps the in-process LocalServer. Pass the
	// seed shown in the numpad input so the run starts with exactly what the
	// player saw (LocalServer honors it; RemoteServer ignores it).
	//
	// The mode is the explicit pre-session flag (`setMultiplayerMode`, set by
	// every run-entry point) — NEVER the previous session's server-authored
	// `session_type`, which sits in client state after a multiplayer run ends or
	// bounces (e.g. an expired token). Routing off that stale value sent a
	// single-player new run to the remote server, where it failed with
	// "Multiplayer requires a login" and the Play button did nothing.
	const server = isMultiplayerMode() ? remoteServer : LocalServer;
	const customSeed = env.state.session.seed;
	const session = await server.createSession(LOCAL_PLAYER_ID, selectedCrystal.id, customSeed);

	env.patchState({ session });

	await go("battleground", { crystalId: selectedCrystal.id });
};
