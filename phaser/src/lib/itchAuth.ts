/**
 * Client-side itch.io login flow for the web build (docs/itchio-auth.md).
 *
 * itch.io uses the OAuth **implicit flow** (no client secret): we open a popup
 * at `https://itch.io/user/oauth`, the player authorizes, itch redirects back
 * to the game page with the token in the URL hash (`#access_token=…&state=…`),
 * and that page posts the token back to this opener over same-origin
 * `postMessage`. The server then validates it against `api.itch.io/profile`
 * (`POST /api/v1/auth/itch`) and issues the opaque bearer token that every
 * RemoteServer request carries.
 *
 * Token acquisition priority (docs/itchio-auth.md Phase B):
 *   1. URL query param — itch-app HTML5 webview injection (opportunistic;
 *      confirm the exact param name against the itch app docs in Phase D).
 *   2. Stashed hash token — a top-level-redirect OAuth return (the main.ts
 *      boot capture stashes it and clears the hash).
 *   3. OAuth popup with a per-login `state` nonce + same-origin `postMessage`;
 *      if the popup is blocked, fall back to a top-level redirect (whose
 *      return is captured at boot on the next load).
 *
 * The access token is a credential — persisted and POSTed, but never logged.
 */

import { storage } from "@Systems/Storage";
import type { StorageProvider } from "@Systems/Storage";
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
/** Popup window features (popup= keeps it a feature-detectable popup). */
const POPUP_FEATURES = "popup=yes,width=520,height=600";
/** How long to wait for the popup to post the token back. */
export const DEFAULT_POPUP_TIMEOUT_MS = 2 * 60 * 1000;

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
	isConfigured(): boolean;
	getStoredSession(): AuthSession | null;
	getBearerToken(): string | null;
	clearSession(): void;
};

export type ItchAuthDeps = {
	storage: StorageProvider;
	fetch: typeof globalThis.fetch;
	serverUrl: string;
	clientId: string;
	redirectUri: string;
	openWindow: (url: string) => Window | null;
	readQueryToken: () => string | null;
	waitForPopupMessage: (state: string, timeoutMs?: number) => Promise<string>;
	generateState: () => string;
	redirect: (url: string) => void;
	popupTimeoutMs: number;
};

function readClientId(): string {
	return typeof process !== "undefined" && process.env
		? (process.env.MANA_ITCH_CLIENT_ID ?? "")
		: "";
}

function readRedirectUri(): string {
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

function defaultWaitForPopupMessage(state: string, timeoutMs: number): Promise<string> {
	return new Promise((resolve, reject) => {
		const cleanup = () => {
			window.removeEventListener("message", onMessage);
			if (timer !== undefined) clearTimeout(timer);
		};
		const onMessage = (event: MessageEvent) => {
			// The popup is our own game page — same origin.
			if (event.origin !== window.location.origin) return;
			const data = isRecord(event.data) ? event.data : {};
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
	const redirectUri = deps.redirectUri ?? readRedirectUri();
	const openWindow = deps.openWindow ?? defaultOpenWindow;
	const readQueryToken = deps.readQueryToken ?? defaultReadQueryToken;
	const waitForPopupMessage = deps.waitForPopupMessage ?? defaultWaitForPopupMessage;
	const generateState = deps.generateState ?? defaultGenerateState;
	const redirect = deps.redirect ?? defaultRedirect;
	const popupTimeoutMs = deps.popupTimeoutMs ?? DEFAULT_POPUP_TIMEOUT_MS;

	/** Acquire an itch.io credential (no awaits before the popup opens). */
	const acquireCredential = async (): Promise<string> => {
		const queryToken = readQueryToken();
		if (queryToken) return queryToken;

		const stashed = consumeStashedToken();
		if (stashed) return stashed;

		const state = generateState();
		const url = buildItchAuthUrl({ clientId, redirectUri, state });
		const popup = openWindow(url);
		if (!popup) {
			// Popup blocked — top-level redirect fallback. The returned page's
			// boot capture stashes the token for the next loginWithItch().
			redirect(url);
			throw new Error(
				"itch.io authorization popup was blocked — the page will redirect to complete login"
			);
		}
		return waitForPopupMessage(state, popupTimeoutMs);
	};

	const loginWithItch = async (): Promise<AuthSession> => {
		// Reuse a stored server session if present — itch OAuth keys are
		// long-lived, so repeat visits skip the popup entirely.
		const stored = sessionStore.readStoredSession();
		if (stored) return stored;

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
		isConfigured: () => Boolean(clientId && clientId !== ""),
		getStoredSession: sessionStore.readStoredSession,
		getBearerToken: sessionStore.getBearerToken,
		clearSession: sessionStore.clearSession,
	};
}

/** Default client wired to the real storage, window, and fetch. */
export const itchAuth = createItchAuthClient();
