/**
 * Client-side guest login (docs/auth.md — guest accounts).
 *
 * Guests have no OAuth round-trip: `loginAsGuest()` POSTs to
 * `POST /api/v1/auth/guest` (no credential) and persists the issued
 * `{ token, player }` session under `mana_auth_session` like every other
 * provider. The server assigns a random `AdjectiveNounNN` handle.
 *
 * The Bearer [REDACTED] is a credential — persisted and POSTed, but never logged.
 */

import { storage } from "@Systems/Storage";
import type { StorageProvider } from "@Systems/Storage";
import {
	createAuthSessionStore,
	parseSessionPayload,
	readServerUrl,
	type AuthSession,
} from "./authSession";

export type GuestAuthClient = {
	/**
	 * Full guest login: POST to `/api/v1/auth/guest` (no credential) →
	 * persist → return the session. Every call mints a fresh guest player —
	 * there is no account to reuse.
	 */
	loginAsGuest(): Promise<AuthSession>;
	/** The persisted session, or null when logged out / entry is corrupt. */
	getStoredSession(): AuthSession | null;
	/** Bearer [REDACTED] for RemoteServer requests (or null). */
	getBearerToken(): string | null;
	clearSession(): void;
};

export type GuestAuthDeps = {
	storage: StorageProvider;
	fetch: typeof globalThis.fetch;
	serverUrl: string;
};

function defaultFetch(): typeof globalThis.fetch {
	if (typeof globalThis.fetch !== "function") {
		throw new Error("Fetch is not available in this environment");
	}
	return globalThis.fetch.bind(globalThis);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createGuestAuthClient(deps: Partial<GuestAuthDeps> = {}): GuestAuthClient {
	const provider = deps.storage ?? storage;
	const sessionStore = createAuthSessionStore(provider);
	const getFetch = (): typeof globalThis.fetch => deps.fetch ?? defaultFetch();
	const serverUrl = deps.serverUrl ?? readServerUrl();

	const loginAsGuest = async (): Promise<AuthSession> => {
		let res: Response;
		try {
			res = await getFetch()(`${serverUrl}/api/v1/auth/guest`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			throw new Error(`Guest login request failed: ${message}`);
		}

		let payload: unknown;
		try {
			payload = await res.json();
		} catch {
			throw new Error(`Guest login failed (HTTP ${res.status})`);
		}

		if (!res.ok) {
			const code =
				isRecord(payload) && typeof payload.error === "string"
					? payload.error
					: `HTTP ${res.status}`;
			throw new Error(`Guest login rejected by the server (${code})`);
		}

		const session = parseSessionPayload(payload);
		// Never log the token — it is a Bearer [REDACTED] (docs/auth.md).
		sessionStore.saveSession(session);
		return session;
	};

	return {
		loginAsGuest,
		getStoredSession: sessionStore.readStoredSession,
		getBearerToken: sessionStore.getBearerToken,
		clearSession: sessionStore.clearSession,
	};
}

/** Default client wired to the real storage and fetch. */
export const guestAuth = createGuestAuthClient();
