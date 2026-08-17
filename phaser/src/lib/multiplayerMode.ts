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
