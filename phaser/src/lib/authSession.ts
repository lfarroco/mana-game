/**
 * Shared client auth-session store (docs/itchio-auth.md Phase B1).
 *
 * Extracted from steamAuth.ts so Steam (Electron) and itch.io (web) logins
 * share one persisted `{ token, player }` session under the key
 * `mana_auth_session`. The server is the identity authority — the client only
 * stores what it issued. The provider is preserved from the server response
 * (per-provider players are distinct records; one session per device,
 * overwritten on platform switch).
 *
 * The bearer token is a credential — persisted but never logged or echoed.
 */

import { storage } from "@Systems/Storage";
import type { StorageProvider } from "@Systems/Storage";

export type AuthProvider = "steam" | "itch" | "google";

export type AuthPlayer = {
	playerId: string;
	provider: AuthProvider;
	providerId: string;
	displayName?: string;
};

export type AuthSession = {
	token: string;
	player: AuthPlayer;
};

/** Storage key for the persisted `{ token, player }` auth session. */
export const AUTH_STORAGE_KEY = "mana_auth_session";

/** Default game-server base URL; `MANA_SERVER_URL` (build-time env) overrides. */
export const DEFAULT_SERVER_URL = "http://127.0.0.1:8787";

/**
 * Game-server base URL from the build-time define (fallback: localhost).
 *
 * NOTE: this reads `process.env.MANA_SERVER_URL` directly — there must be NO
 * `typeof process` / `process.env` guard here. webpack's DefinePlugin replaces
 * this exact expression at build time with the baked string literal (see
 * phaser/webpack/config.base.cjs), so no runtime `process` access ever happens
 * in the browser bundle. A `typeof process` guard silently breaks browser
 * builds: webpack 5 ships no `process`, so the ternary always fell through to
 * the fallback and released clients pointed at 127.0.0.1:8787. Jest/Node
 * contexts read the real environment — identical behavior to the old guard.
 */
export function readServerUrl(): string {
	const fromEnv = process.env.MANA_SERVER_URL;
	return fromEnv && fromEnv.trim() !== "" ? fromEnv : DEFAULT_SERVER_URL;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuthProvider(value: unknown): value is AuthProvider {
	return value === "steam" || value === "itch" || value === "google";
}

/**
 * Shape-validate the server's `{ player, token }` login payload. Steam and
 * itch share the same wire shape; the provider comes from the server response.
 */
export function parseSessionPayload(payload: unknown): AuthSession {
	const body = isRecord(payload) ? payload : {};
	const player = isRecord(body.player) ? body.player : {};

	if (
		typeof body.token !== "string" ||
		body.token === "" ||
		typeof player.playerId !== "string" ||
		player.playerId === "" ||
		typeof player.providerId !== "string" ||
		!isAuthProvider(player.provider)
	) {
		throw new Error("Auth login returned an unexpected response shape");
	}

	return {
		token: body.token,
		player: {
			playerId: player.playerId,
			provider: player.provider,
			providerId: player.providerId,
			displayName: typeof player.displayName === "string" ? player.displayName : undefined,
		},
	};
}

export type AuthSessionStore = {
	/** The persisted session, or null when logged out / entry is corrupt. */
	readStoredSession(): AuthSession | null;
	saveSession(session: AuthSession): void;
	clearSession(): void;
	/** Bearer token for RemoteServer requests (or null). */
	getBearerToken(): string | null;
};

export function createAuthSessionStore(provider: StorageProvider): AuthSessionStore {
	const readStoredSession = (): AuthSession | null => {
		const raw = provider.getItem(AUTH_STORAGE_KEY);
		if (!raw) return null;
		try {
			return parseSessionPayload(JSON.parse(raw));
		} catch {
			return null; // corrupt entry — treat as logged out
		}
	};

	return {
		readStoredSession,
		saveSession: (session) => {
			provider.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
		},
		clearSession: () => provider.removeItem(AUTH_STORAGE_KEY),
		getBearerToken: () => readStoredSession()?.token ?? null,
	};
}

/** Default store wired to the real storage provider. */
export const authSession = createAuthSessionStore(storage);
