/**
 * Explicit multiplayer-mode flag for the pre-session flow.
 *
 * The arena button (multiplayer entry) sets this before navigating to crystal
 * selection; session creation (`startNewGame`) reads it to choose the remote
 * server, and the crystal screen uses it to hide the custom-seed UI (the
 * server owns the seed in multiplayer).
 *
 * A separate flag rather than mutating `env.state.session.session_type` —
 * that field is the *server-authored* type (singleplayer | multiplayer) and
 * no session exists yet while the player is picking a crystal. Mutating the
 * dummy session would leak "multiplayer" into later single-player flows.
 *
 * The flag is set explicitly by every run-entry point:
 *   - Multiplayer button → true
 *   - Single-player "New Run" → false
 *   - Results-screen "New Run" → left as-is (continue in the current mode)
 */

let multiplayerMode = false;

export function setMultiplayerMode(mode: boolean): void {
	multiplayerMode = mode;
}

export function isMultiplayerMode(): boolean {
	return multiplayerMode;
}

/**
 * Where the title-screen multiplayer button leads.
 *
 * A stored `{ token, player }` auth session (guest, Google, itch.io, or
 * Steam) skips the login screen and lands straight in the lobby — the lobby
 * re-validates the Bearer [REDACTED] and bounces expired sessions back to the
 * logged-out flow. Without a session, Electron (Steam build) auto-logs-in
 * while every other platform picks a provider on the login screen.
 */
export type MultiplayerEntryTarget = "lobby" | "steam_login" | "login_screen";

export function resolveMultiplayerEntry(
	hasStoredSession: boolean,
	electron: boolean
): MultiplayerEntryTarget {
	if (hasStoredSession) return "lobby";
	return electron ? "steam_login" : "login_screen";
}
