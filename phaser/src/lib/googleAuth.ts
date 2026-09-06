/**
 * Client-side Google sign-in (docs/android-multiplayer.md, docs/itchio-auth.md).
 *
 * Google's OIDC implicit flow (`response_type=id_token`): the game opens
 * `https://accounts.google.com/o/oauth2/v2/auth`, the player picks their
 * account, and Google redirects to the game server's OAuth relay page with
 * the ID token in the URL hash (`#id_token=…&state=…`). The relay hands the
 * hash back to the game:
 *
 *   - **Web** (browser/itch.io): the authorize URL opens in a **popup**; the
 *     relay posts the hash to this opener over cross-origin `postMessage`
 *     (origin + state verified), the popup closes.
 *   - **Android** (Capacitor): the authorize URL opens in the **system
 *     browser** (Chrome Custom Tab); the relay forwards the hash via a
 *     custom-scheme deep link (`com.manabattle.app://oauth#…`), surfaced by
 *     `@capacitor/app`'s `appUrlOpen` (src/lib/oauthAndroid.ts).
 *
 * This module POSTs the ID token to `POST /api/v1/auth/google`, where the
 * server verifies it (audience = MANA_GOOGLE_CLIENT_ID) and issues the
 * shared opaque bearer token persisted under `mana_auth_session`.
 *
 * Google blocks OAuth inside embedded **WebViews** (`disallowed_useragent`),
 * which is why Android uses the system browser instead of a WebView popup;
 * plain browser popups (web) are fine.
 *
 * The ID token is a credential — persisted and POSTed, but never logged.
 */

import { storage } from "@Systems/Storage";
import type { StorageProvider } from "@Systems/Storage";
import { isCapacitor } from "@Utils/environment";
import { oauthAndroid, readOAuthRelayUri, type OAuthAndroidDeps } from "./oauthAndroid";
import { OAUTH_RELAY_MESSAGE_TYPE, parseOAuthRelayPayload, readRelayOrigin } from "./oauthReturn";
import {
	createAuthSessionStore,
	parseSessionPayload,
	readServerUrl,
	type AuthSession,
} from "./authSession";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_SCOPE = "openid profile email";
/** How long to wait for the OAuth return (deep link or popup message). */
export const DEFAULT_OAUTH_TIMEOUT_MS = 2 * 60 * 1000;
/** Popup window features (popup= keeps it a feature-detectable popup). */
const GOOGLE_POPUP_FEATURES = "popup=yes,width=520,height=600";

/** Build the Google OAuth authorize URL (OIDC implicit flow). */
export function buildGoogleAuthUrl(input: {
	clientId: string;
	redirectUri: string;
	state: string;
	nonce: string;
}): string {
	const params = new URLSearchParams({
		client_id: input.clientId,
		redirect_uri: input.redirectUri,
		response_type: "id_token",
		scope: GOOGLE_SCOPE,
		nonce: input.nonce,
		state: input.state,
	});
	return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleAuthClient = {
	/**
	 * Full login: acquire an ID token (system browser on Android, popup on
	 * web) → POST it to `POST /api/v1/auth/google` → persist → return the
	 * session. Throws when no credential is produced or the server rejects
	 * the request.
	 */
	loginWithGoogle(): Promise<AuthSession>;
	/**
	 * Acquire a raw Google ID token WITHOUT touching the stored session or
	 * the server. Used by the guest "connect account" flow, which POSTs the
	 * credential to `/players/me/convert` instead of `/auth/google`
	 * (loginWithGoogle would short-circuit on the guest's stored session and
	 * never reach the provider).
	 */
	getCredential(): Promise<string>;
	/** True when a Google OAuth client id is baked into this build. */
	isConfigured(): boolean;
	/** The persisted session, or null when logged out / entry is corrupt. */
	getStoredSession(): AuthSession | null;
	/** Bearer token for RemoteServer requests (or null). */
	getBearerToken(): string | null;
	clearSession(): void;
};

export type GoogleAuthDeps = {
	storage: StorageProvider;
	fetch: typeof globalThis.fetch;
	serverUrl: string;
	/** Public Google OAuth client id (baked at build time). */
	clientId: string;
	/** OAuth redirect URI — the game server's relay page (`<server>/oauth/callback`). */
	redirectUri: string;
	/** Android OAuth transport (system browser + deep link). */
	android: OAuthAndroidDeps;
	/** Platform check — defaults to Capacitor detection. */
	isAndroid: () => boolean;
	/** Web popup opener (defaults to `window.open`). */
	openWindow: (url: string) => Window | null;
	/** Wait for the relay page's cross-origin return in the popup (web). */
	waitForPopupMessage: (state: string, timeoutMs?: number) => Promise<string>;
	generateState: () => string;
	timeoutMs: number;
};

/**
 * Google OAuth client id baked in at build time by webpack's DefinePlugin
 * (phaser/webpack/config.base.cjs; empty when unset). Same DefinePlugin
 * contract as MANA_ITCH_CLIENT_ID — see itchAuth.ts.
 */
function readClientId(): string {
	return process.env.MANA_GOOGLE_CLIENT_ID ?? "";
}

function defaultGenerateState(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return Math.random().toString(36).slice(2);
}

function defaultFetch(): typeof globalThis.fetch {
	if (typeof globalThis.fetch !== "function") {
		throw new Error("Fetch is not available in this environment");
	}
	return globalThis.fetch.bind(globalThis);
}

function defaultOpenWindow(url: string): Window | null {
	return window.open(url, "mana-battle-google-auth", GOOGLE_POPUP_FEATURES);
}

/**
 * Default web popup-return listener: the relay page (same origin as the game
 * server) posts `{ type, payload: "id_token=…&state=…" }` to the opener.
 * Origin + state nonce are verified before the ID token is accepted.
 */
function createDefaultWaitForPopupMessage(serverUrl: string) {
	const relayOrigin = readRelayOrigin(serverUrl);

	return function defaultWaitForPopupMessage(state: string, timeoutMs: number): Promise<string> {
		return new Promise((resolve, reject) => {
			const cleanup = () => {
				window.removeEventListener("message", onMessage);
				if (timer !== undefined) clearTimeout(timer);
			};
			const onMessage = (event: MessageEvent) => {
				if (relayOrigin === "" || event.origin !== relayOrigin) return;
				const data = isRecord(event.data) ? event.data : {};
				if (data.type !== OAUTH_RELAY_MESSAGE_TYPE || typeof data.payload !== "string") {
					return;
				}
				const parsed = parseOAuthRelayPayload(data.payload);
				if (!parsed) {
					cleanup();
					reject(new Error("Google sign-in was cancelled"));
					return;
				}
				if (parsed.state !== state) return; // nonce mismatch — ignore
				cleanup();
				resolve(parsed.token);
			};
			const timer = setTimeout(() => {
				cleanup();
				reject(new Error("Google sign-in timed out"));
			}, timeoutMs);
			window.addEventListener("message", onMessage);
		});
	};
}

export function createGoogleAuthClient(deps: Partial<GoogleAuthDeps> = {}): GoogleAuthClient {
	const provider = deps.storage ?? storage;
	const sessionStore = createAuthSessionStore(provider);
	const getFetch = (): typeof globalThis.fetch => deps.fetch ?? defaultFetch();
	const serverUrl = deps.serverUrl ?? readServerUrl();
	const clientId = deps.clientId ?? readClientId();
	const redirectUri = deps.redirectUri ?? readOAuthRelayUri(serverUrl);
	const android = deps.android ?? oauthAndroid;
	const isAndroid = deps.isAndroid ?? isCapacitor;
	const openWindow = deps.openWindow ?? defaultOpenWindow;
	const waitForPopupMessage =
		deps.waitForPopupMessage ?? createDefaultWaitForPopupMessage(serverUrl);
	const generateState = deps.generateState ?? defaultGenerateState;
	const timeoutMs = deps.timeoutMs ?? DEFAULT_OAUTH_TIMEOUT_MS;

	/** Acquire a Google ID token via the system browser (Android) or popup (web). */
	const acquireCredential = async (): Promise<string> => {
		const state = generateState();
		const nonce = generateState();
		const url = buildGoogleAuthUrl({ clientId, redirectUri, state, nonce });

		if (isAndroid()) {
			// Capacitor WebView: window.open popups cannot work — open the
			// authorize URL in the system browser and receive the return via
			// the relay page + custom-scheme deep link
			// (docs/android-multiplayer.md).
			return android.runOAuthAndroid(url, { state, timeoutMs });
		}

		// Web: OAuth popup → relay page → cross-origin postMessage (the relay
		// origin + state nonce are verified by waitForPopupMessage).
		const popup = openWindow(url);
		if (!popup) {
			throw new Error("Google sign-in popup was blocked — allow popups to sign in with Google");
		}
		return waitForPopupMessage(state, timeoutMs);
	};

	const getCredential = async (): Promise<string> => {
		if (!clientId || clientId === "") {
			throw new Error(
				"Google auth not configured — set MANA_GOOGLE_CLIENT_ID to enable Google sign-in"
			);
		}

		// NOTE: nothing above awaits, so the popup (when needed) opens
		// synchronously within the user gesture (popup-blocker requirement).
		const credential = await acquireCredential();
		if (!credential) {
			throw new Error("Google sign-in did not return an ID token");
		}
		return credential;
	};

	const loginWithGoogle = async (): Promise<AuthSession> => {
		// Reuse a stored server session if present (any provider — one session
		// per device, docs/auth.md).
		const stored = sessionStore.readStoredSession();
		if (stored) return stored;

		const credential = await getCredential();

		let res: Response;
		try {
			res = await getFetch()(`${serverUrl}/api/v1/auth/google`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken: credential }),
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			throw new Error(`Google login request failed: ${message}`);
		}

		let payload: unknown;
		try {
			payload = await res.json();
		} catch {
			throw new Error(`Google login failed (HTTP ${res.status})`);
		}

		if (!res.ok) {
			const code =
				isRecord(payload) && typeof payload.error === "string"
					? payload.error
					: `HTTP ${res.status}`;
			throw new Error(`Google login rejected by the server (${code})`);
		}

		const session = parseSessionPayload(payload);
		// Never log the token — it is a bearer credential (docs/auth.md).
		sessionStore.saveSession(session);
		return session;
	};

	return {
		loginWithGoogle,
		getCredential,
		isConfigured: () => Boolean(clientId && clientId !== ""),
		getStoredSession: sessionStore.readStoredSession,
		getBearerToken: sessionStore.getBearerToken,
		clearSession: sessionStore.clearSession,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Default client wired to the real storage, window, Capacitor transport, and fetch. */
export const googleAuth = createGoogleAuthClient();
