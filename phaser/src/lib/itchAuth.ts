/**
 * Client-side itch.io login flow (docs/itchio-auth.md).
 *
 * itch.io uses the OAuth **implicit flow** (no client secret): we open a popup
 * at `https://itch.io/user/oauth`, the player authorizes, and itch redirects
 * to the game server's **OAuth relay page** with the token in the URL hash
 * (`#access_token=…&state=…`). The relay (a stable URL — it never changes on
 * deploy, unlike the game's iframe URL) posts the token back to this opener
 * over cross-origin `postMessage`. The server then validates it against
 * `api.itch.io/profile` (`POST /api/v1/auth/itch`) and issues the opaque
 * bearer token that every RemoteServer request carries.
 *
 * Token acquisition priority (docs/itchio-auth.md Phase B):
 *   1. URL query param — itch-app HTML5 webview injection (opportunistic;
 *      confirm the exact param name against the itch app docs in Phase D).
 *   2. Stashed hash token — a top-level-redirect OAuth return (the main.ts
 *      boot capture stashes it and clears the hash).
 *   3. OAuth popup → relay page → cross-origin `postMessage`; if the popup is
 *      blocked, fall back to a top-level redirect whose state carries the
 *      game URL so the relay can send the browser back here with the hash
 *      (captured at boot on the next load).
 *
 * The access token is a credential — persisted and POSTed, but never logged.
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

export const ITCH_AUTH_URL = "https://itch.io/user/oauth";
export const ITCH_SCOPE = "profile:me";
/** postMessage channel type used by the popup → opener handshake. */
export const ITCH_AUTH_MESSAGE_TYPE = "mana-itch-auth";
/** Alias for the shared relay message type (src/lib/oauthReturn.ts). */
export { OAUTH_RELAY_MESSAGE_TYPE as ITCH_RELAY_MESSAGE_TYPE } from "./oauthReturn";
/** Popup window features (popup= keeps it a feature-detectable popup). */
const POPUP_FEATURES = "popup=yes,width=520,height=600";
/** How long to wait for the popup to post the token back. */
export const DEFAULT_POPUP_TIMEOUT_MS = 2 * 60 * 1000;

/** Separator between the OAuth nonce and the game URL in the fallback state. */
export const FALLBACK_STATE_SEPARATOR = "|";

/**
 * Popup-blocked fallback state: `<nonce>|<gameUrl>`. The relay page splits on
 * the separator: with a game URL it sends the browser back to the game with
 * the token hash (web); without one (Android) it opens the custom scheme.
 */
export function encodeFallbackState(state: string, gameUrl: string): string {
	return `${state}${FALLBACK_STATE_SEPARATOR}${gameUrl}`;
}

/** Split a fallback state into `{ state, gameUrl? }`. */
export function parseFallbackState(state: string): { state: string; gameUrl?: string } {
	const idx = state.indexOf(FALLBACK_STATE_SEPARATOR);
	if (idx < 0) return { state };
	return { state: state.slice(0, idx), gameUrl: state.slice(idx + 1) };
}

/** Build the itch.io OAuth authorize URL (implicit flow). */
export function buildItchAuthUrl(input: {
	clientId: string;
	redirectUri: string;
	state: string;
}): string {
	const params = new URLSearchParams({
		client_id: input.clientId,
		scope: ITCH_SCOPE,
		response_type: "token",
		redirect_uri: input.redirectUri,
		state: input.state,
	});
	return `${ITCH_AUTH_URL}?${params.toString()}`;
}

/** Extract `access_token` (+ optional `state`) from an OAuth return hash. */
export function parseHashForOAuth(hash: string): { token: string; state?: string } | null {
	if (!hash || hash === "#") return null;
	const raw = hash.startsWith("#") ? hash.slice(1) : hash;
	const params = new URLSearchParams(raw);
	const token = params.get("access_token");
	if (!token || token === "") return null;
	return { token, state: params.get("state") ?? undefined };
}

/**
 * Handle an OAuth callback page load. Returns `true` when the page was a
 * popup return (message posted + window closed — the game must NOT boot) and
 * `false` otherwise (top-level return stashes the token for `loginWithItch`,
 * or nothing to handle — the game boots normally).
 */
export function handleOAuthCallback(input: {
	parsed: { token: string; state?: string } | null;
	hasOpener: boolean;
	origin: string;
	currentPath: string;
	postMessage: (data: unknown, targetOrigin: string) => void;
	close: () => void;
	replaceHashWithPath: (path: string) => void;
	stashToken: (token: string) => void;
}): boolean {
	if (!input.parsed && !input.hasOpener) return false;

	if (input.parsed) {
		// Never keep the token in the URL after login (docs/itchio-auth.md D3).
		input.replaceHashWithPath(input.currentPath);
	}

	if (input.hasOpener) {
		input.postMessage(
			input.parsed
				? {
						type: ITCH_AUTH_MESSAGE_TYPE,
						token: input.parsed.token,
						state: input.parsed.state,
					}
				: { type: ITCH_AUTH_MESSAGE_TYPE, cancelled: true },
			input.origin
		);
		input.close();
		return true;
	}

	if (input.parsed) {
		// Top-level return: stash for the next loginWithItch(), boot normally.
		input.stashToken(input.parsed.token);
	}
	return false;
}

/** Boot-time capture: run once before the game starts (main.ts). */
export function handleOAuthCallbackIfPresent(): boolean {
	return handleOAuthCallback({
		parsed: parseHashForOAuth(window.location.hash),
		hasOpener: Boolean(window.opener),
		origin: window.location.origin,
		currentPath: window.location.origin + window.location.pathname,
		postMessage: (data, targetOrigin) => window.opener?.postMessage(data, targetOrigin),
		close: () => window.close(),
		replaceHashWithPath: (path) => window.history.replaceState(null, "", path),
		stashToken: (token) => {
			stashedToken = token;
		},
	});
}

/** Stash consumed by the next `loginWithItch()` (top-level redirect return). */
let stashedToken: string | null = null;

export function consumeStashedToken(): string | null {
	const token = stashedToken;
	stashedToken = null;
	return token;
}

export type ItchAuthClient = {
	loginWithItch(): Promise<AuthSession>;
	/**
	 * Acquire a raw itch.io OAuth credential WITHOUT touching the stored
	 * session or the server. Used by the guest "connect account" flow, which
	 * POSTs the credential to `/players/me/convert` instead of `/auth/itch`
	 * (loginWithItch would short-circuit on the guest's stored session and
	 * never reach the provider).
	 */
	getCredential(): Promise<string>;
	isConfigured(): boolean;
	getStoredSession(): AuthSession | null;
	getBearerToken(): string | null;
	clearSession(): void;
};

export type ItchAuthDeps = {
	storage: StorageProvider;
	fetch: typeof globalThis.fetch;
	/** Game-server base URL — also derives the OAuth relay URL (`<server>/oauth/callback`). */
	serverUrl: string;
	clientId: string;
	openWindow: (url: string) => Window | null;
	readQueryToken: () => string | null;
	waitForPopupMessage: (state: string, timeoutMs?: number) => Promise<string>;
	generateState: () => string;
	redirect: (url: string) => void;
	popupTimeoutMs: number;
	/**
	 * Android (Capacitor) OAuth transport — system browser + custom-scheme
	 * deep link, used instead of the popup flow inside the WebView
	 * (docs/android-multiplayer.md).
	 */
	android: OAuthAndroidDeps;
	/** Platform check — defaults to Capacitor detection. */
	isAndroid: () => boolean;
};

/**
 * Itch.io OAuth client id baked in at build time by webpack's DefinePlugin
 * (phaser/webpack/config.base.cjs; empty when unset).
 *
 * NOTE: this reads `process.env.MANA_ITCH_CLIENT_ID` directly — there must be
 * NO `typeof process` / `process.env` guard here, for the same reason as
 * `readServerUrl()` in authSession.ts: DefinePlugin replaces this exact
 * expression with the baked string literal, so no runtime `process` access
 * happens in the browser. A `typeof process` guard breaks browser builds
 * (webpack 5 ships no `process`), making the ternary fall through to "" — the
 * "itch auth not configured" bug that broke browser multiplayer on the live
 * page despite the client id being present in the bundle.
 */
function readClientId(): string {
	return process.env.MANA_ITCH_CLIENT_ID ?? "";
}

/**
 * The page the game code is running at (`window.location.origin + pathname`,
 * never the query or hash). Used only to carry the game URL in the
 * popup-blocked fallback state so the relay can send the browser back to this
 * page with the token hash. On the live itch.io embed this is the direct
 * iframe URL (`https://html-classic.itch.zone/html/<game>/<upload>/index.html`)
 * — which is why the OAuth callback itself can no longer be this URL (it
 * changes on every deploy); the stable relay is the callback instead.
 */
function readGamePageUrl(): string {
	if (typeof window === "undefined") return "";
	return window.location.origin + window.location.pathname;
}

function defaultOpenWindow(url: string): Window | null {
	return window.open(url, "mana-battle-itch-auth", POPUP_FEATURES);
}

function defaultReadQueryToken(): string | null {
	if (typeof window === "undefined") return null;
	const params = new URLSearchParams(window.location.search);
	return params.get("api_key") ?? params.get("access_token");
}

function defaultGenerateState(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return Math.random().toString(36).slice(2);
}

/**
 * Default popup-return listener. Accepts the **relay message** (web flow —
 * the game server's relay page posts the raw hash payload from its own
 * origin, verified here against the server's origin + the state nonce) and
 * the **legacy same-origin message** (when the popup is the game page itself,
 * e.g. a top-level redirect return handled by the boot capture).
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
				const data = isRecord(event.data) ? event.data : {};

				// Relay message: the relay page (same server as the API) posts
				// `{ type, payload: "access_token=…&state=…" }` to the opener.
				if (
					relayOrigin !== "" &&
					event.origin === relayOrigin &&
					data.type === OAUTH_RELAY_MESSAGE_TYPE &&
					typeof data.payload === "string"
				) {
					const parsed = parseOAuthRelayPayload(data.payload);
					if (!parsed) {
						cleanup();
						reject(new Error("itch.io authorization was cancelled"));
						return;
					}
					if (parsed.state !== state) return; // nonce mismatch — ignore
					cleanup();
					resolve(parsed.token);
					return;
				}

				// Legacy: the popup is our own game page — same origin.
				if (event.origin !== window.location.origin) return;
				if (data.type !== ITCH_AUTH_MESSAGE_TYPE) return;
				if (data.cancelled === true) {
					if (data.state === undefined || data.state === state) {
						cleanup();
						reject(new Error("itch.io authorization was cancelled"));
					}
					return;
				}
				if (data.state !== state) return; // nonce mismatch — ignore
				cleanup();
				resolve(typeof data.token === "string" ? data.token : "");
			};
			const timer = setTimeout(() => {
				cleanup();
				reject(new Error("itch.io authorization timed out"));
			}, timeoutMs);
			window.addEventListener("message", onMessage);
		});
	};
}

function defaultRedirect(url: string): void {
	window.location.href = url;
}

function defaultFetch(): typeof globalThis.fetch {
	if (typeof globalThis.fetch !== "function") {
		throw new Error("Fetch is not available in this environment");
	}
	return globalThis.fetch.bind(globalThis);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createItchAuthClient(deps: Partial<ItchAuthDeps> = {}): ItchAuthClient {
	const provider = deps.storage ?? storage;
	const sessionStore = createAuthSessionStore(provider);
	const getFetch = (): typeof globalThis.fetch => deps.fetch ?? defaultFetch();
	const serverUrl = deps.serverUrl ?? readServerUrl();
	const clientId = deps.clientId ?? readClientId();
	// The OAuth callback is the game server's stable relay page — never the
	// (deploy-changing) page the game happens to run at (docs/itchio-auth.md).
	const relayUri = readOAuthRelayUri(serverUrl);
	const openWindow = deps.openWindow ?? defaultOpenWindow;
	const readQueryToken = deps.readQueryToken ?? defaultReadQueryToken;
	const waitForPopupMessage =
		deps.waitForPopupMessage ?? createDefaultWaitForPopupMessage(serverUrl);
	const generateState = deps.generateState ?? defaultGenerateState;
	const redirect = deps.redirect ?? defaultRedirect;
	const popupTimeoutMs = deps.popupTimeoutMs ?? DEFAULT_POPUP_TIMEOUT_MS;
	const android = deps.android ?? oauthAndroid;
	const isAndroid = deps.isAndroid ?? isCapacitor;

	/** Acquire an itch.io credential (no awaits before the popup opens). */
	const acquireCredential = async (): Promise<string> => {
		const queryToken = readQueryToken();
		if (queryToken) return queryToken;

		const stashed = consumeStashedToken();
		if (stashed) return stashed;

		const state = generateState();

		if (isAndroid()) {
			// Capacitor WebView: window.open popups cannot work — open the
			// authorize URL in the system browser and receive the return via
			// the relay page + custom-scheme deep link
			// (docs/android-multiplayer.md).
			const url = buildItchAuthUrl({ clientId, redirectUri: relayUri, state });
			return android.runOAuthAndroid(url, { state, timeoutMs: popupTimeoutMs });
		}

		const url = buildItchAuthUrl({ clientId, redirectUri: relayUri, state });
		const popup = openWindow(url);
		if (!popup) {
			// Popup blocked — top-level redirect fallback. The fallback state
			// carries this page's URL so the relay can send the browser back
			// here with the token hash; the boot capture stashes it for the
			// next loginWithItch().
			const fallbackUrl = buildItchAuthUrl({
				clientId,
				redirectUri: relayUri,
				state: encodeFallbackState(state, readGamePageUrl()),
			});
			redirect(fallbackUrl);
			throw new Error(
				"itch.io authorization popup was blocked — the page will redirect to complete login"
			);
		}
		return waitForPopupMessage(state, popupTimeoutMs);
	};

	const getCredential = async (): Promise<string> => {
		if (!clientId || clientId === "") {
			throw new Error(
				"itch auth not configured — set MANA_ITCH_CLIENT_ID to enable browser multiplayer"
			);
		}

		// NOTE: nothing above awaits, so the popup (when needed) opens
		// synchronously within the user gesture (popup-blocker requirement).
		const token = await acquireCredential();
		if (!token) {
			throw new Error("itch.io authorization did not return a token");
		}
		return token;
	};

	const loginWithItch = async (): Promise<AuthSession> => {
		// Reuse a stored server session if present — itch OAuth keys are
		// long-lived, so repeat visits skip the popup entirely.
		const stored = sessionStore.readStoredSession();
		if (stored) return stored;

		const token = await getCredential();

		let res: Response;
		try {
			res = await getFetch()(`${serverUrl}/api/v1/auth/itch`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token }),
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			throw new Error(`itch login request failed: ${message}`);
		}

		let payload: unknown;
		try {
			payload = await res.json();
		} catch {
			throw new Error(`itch login failed (HTTP ${res.status})`);
		}

		if (!res.ok) {
			const code =
				isRecord(payload) && typeof payload.error === "string"
					? payload.error
					: `HTTP ${res.status}`;
			throw new Error(`itch login rejected by the server (${code})`);
		}

		const session = parseSessionPayload(payload);
		// Never log the token — it is a bearer credential (docs/auth.md).
		sessionStore.saveSession(session);
		return session;
	};

	return {
		loginWithItch,
		getCredential,
		isConfigured: () => Boolean(clientId && clientId !== ""),
		getStoredSession: sessionStore.readStoredSession,
		getBearerToken: sessionStore.getBearerToken,
		clearSession: sessionStore.clearSession,
	};
}

/** Default client wired to the real storage, window, and fetch. */
export const itchAuth = createItchAuthClient();
