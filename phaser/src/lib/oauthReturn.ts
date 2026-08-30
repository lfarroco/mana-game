/**
 * Shared OAuth-return plumbing for the itch.io and Google login flows
 * (docs/itchio-auth.md, docs/android-multiplayer.md).
 *
 * Both providers use the game server's OAuth relay page
 * (`GET /oauth/callback`) as the callback: the relay posts the raw URL-hash
 * payload back to the opener over cross-origin `postMessage`
 * (`access_token=…&state=…` for itch, `id_token=…&state=…` for Google).
 * These constants/parsers are shared so both login clients listen for the
 * same message shape and verify the same relay origin.
 */

/** postMessage type used by the relay page when it forwards the OAuth hash. */
export const OAUTH_RELAY_MESSAGE_TYPE = "mana-oauth-return";

/**
 * Parse a relay payload ("access_token=…&state=…" or "id_token=…&state=…")
 * into the credential + state. Null when neither token is present.
 */
export function parseOAuthRelayPayload(payload: string): { token: string; state?: string } | null {
	const params = new URLSearchParams(payload);
	const token = params.get("access_token") ?? params.get("id_token");
	if (!token || token === "") return null;
	return { token, state: params.get("state") ?? undefined };
}

/**
 * The relay page's origin (the game server's origin) — what the postMessage
 * listener verifies `event.origin` against. "" when the server URL is
 * malformed (then relay messages are never accepted).
 */
export function readRelayOrigin(serverUrl: string): string {
	try {
		return new URL(serverUrl).origin;
	} catch {
		return "";
	}
}
