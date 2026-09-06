import {
	buildItchAuthUrl,
	consumeStashedToken,
	createItchAuthClient,
	DEFAULT_POPUP_TIMEOUT_MS,
	handleOAuthCallback,
	handleOAuthCallbackIfPresent,
	ITCH_AUTH_MESSAGE_TYPE,
	ITCH_AUTH_URL,
	parseHashForOAuth,
	type ItchAuthDeps,
} from "./itchAuth";
import { AUTH_STORAGE_KEY, DEFAULT_SERVER_URL } from "./authSession";
import type { StorageProvider } from "@Systems/Storage";

/**
 * Unit tests for the client itch.io login flow (docs/itchio-auth.md Phase B).
 *
 * Uses the injectable deps of `createItchAuthClient` (fake storage + mocked
 * fetch + stubbed window/popup hooks) so no real browser popup or itch.io
 * account is needed. The boot-capture path (`handleOAuthCallbackIfPresent`)
 * runs against the jsdom window with a synthetic URL hash.
 */

function createMemoryStorage(): StorageProvider {
	const data = new Map<string, string>();
	return {
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => {
			data.set(key, value);
		},
		removeItem: (key) => {
			data.delete(key);
		},
	};
}

function createFetchMock(
	overrides: {
		ok?: boolean;
		status?: number;
		body?: unknown;
	} = {}
) {
	return jest.fn(async (_url: unknown, _init: unknown) => {
		return {
			ok: overrides.ok ?? true,
			status: overrides.status ?? 200,
			json: async () =>
				overrides.body ?? {
					player: {
						playerId: "9a4f0a1a-0000-4000-8000-000000000001",
						provider: "itch",
						providerId: "1994",
						displayName: "Momo",
					},
					token: "opaque-bearer-token",
				},
		} as unknown as Response;
	});
}

type FetchCall = [string, RequestInit];

function callsOf(fetchMock: jest.Mock): FetchCall[] {
	return fetchMock.mock.calls as FetchCall[];
}

/** Base deps for login tests: configured client id, no query token. */
function baseDeps(overrides: Partial<Parameters<typeof createItchAuthClient>[0]> = {}) {
	return {
		storage: createMemoryStorage(),
		fetch: createFetchMock() as unknown as typeof fetch,
		serverUrl: DEFAULT_SERVER_URL,
		clientId: "client-1",
		openWindow: (() => ({}) as Window) as (url: string) => Window | null,
		readQueryToken: () => null,
		waitForPopupMessage: (async (state: string) => state) as (
			state: string,
			timeoutMs?: number
		) => Promise<string>,
		generateState: () => "nonce-123",
		redirect: (() => {}) as (url: string) => void,
		popupTimeoutMs: DEFAULT_POPUP_TIMEOUT_MS,
		...overrides,
	} as Parameters<typeof createItchAuthClient>[0];
}

describe("buildItchAuthUrl", () => {
	it("builds the itch.io OAuth authorize URL with the implicit-flow params", () => {
		const url = buildItchAuthUrl({
			clientId: "client-1",
			redirectUri: "https://lfarroco.itch.io/mana-battle",
			state: "abc",
		});
		const parsed = new URL(url);
		expect(parsed.origin + parsed.pathname).toBe(ITCH_AUTH_URL);
		expect(parsed.searchParams.get("client_id")).toBe("client-1");
		expect(parsed.searchParams.get("scope")).toBe("profile:me");
		expect(parsed.searchParams.get("response_type")).toBe("token");
		expect(parsed.searchParams.get("redirect_uri")).toBe("https://lfarroco.itch.io/mana-battle");
		expect(parsed.searchParams.get("state")).toBe("abc");
	});
});

describe("parseHashForOAuth", () => {
	it("extracts access_token and state from the OAuth return hash", () => {
		expect(parseHashForOAuth("#access_token=tok&state=abc")).toEqual({
			token: "tok",
			state: "abc",
		});
		expect(parseHashForOAuth("#access_token=tok")).toEqual({
			token: "tok",
			state: undefined,
		});
	});

	it("returns null when there is no access_token", () => {
		expect(parseHashForOAuth("")).toBeNull();
		expect(parseHashForOAuth("#")).toBeNull();
		expect(parseHashForOAuth("#error=access_denied")).toBeNull();
	});
});

describe("handleOAuthCallback", () => {
	it("posts the token to the opener and closes (popup return)", () => {
		const postMessage = jest.fn();
		const close = jest.fn();
		const replace = jest.fn();
		const stash = jest.fn();

		const handled = handleOAuthCallback({
			parsed: { token: "tok", state: "abc" },
			hasOpener: true,
			origin: "https://game.example",
			currentPath: "https://game.example/mana-battle",
			postMessage,
			close,
			replaceHashWithPath: replace,
			stashToken: stash,
		});

		expect(handled).toBe(true);
		// Token must not survive in the URL.
		expect(replace).toHaveBeenCalledWith("https://game.example/mana-battle");
		expect(postMessage).toHaveBeenCalledWith(
			{ type: ITCH_AUTH_MESSAGE_TYPE, token: "tok", state: "abc" },
			"https://game.example"
		);
		expect(close).toHaveBeenCalled();
		expect(stash).not.toHaveBeenCalled();
	});

	it("posts a cancellation to the opener when the popup return has no token", () => {
		const postMessage = jest.fn();
		const close = jest.fn();

		const handled = handleOAuthCallback({
			parsed: null,
			hasOpener: true,
			origin: "https://game.example",
			currentPath: "https://game.example/mana-battle",
			postMessage,
			close,
			replaceHashWithPath: jest.fn(),
			stashToken: jest.fn(),
		});

		expect(handled).toBe(true);
		expect(postMessage).toHaveBeenCalledWith(
			{ type: ITCH_AUTH_MESSAGE_TYPE, cancelled: true },
			"https://game.example"
		);
		expect(close).toHaveBeenCalled();
	});

	it("stashes the token and boots on a top-level redirect return", () => {
		const stash = jest.fn();
		const replace = jest.fn();

		const handled = handleOAuthCallback({
			parsed: { token: "tok" },
			hasOpener: false,
			origin: "https://game.example",
			currentPath: "https://game.example/mana-battle",
			postMessage: jest.fn(),
			close: jest.fn(),
			replaceHashWithPath: replace,
			stashToken: stash,
		});

		expect(handled).toBe(false);
		expect(replace).toHaveBeenCalled();
		expect(stash).toHaveBeenCalledWith("tok");
	});

	it("does nothing when there is neither a token nor an opener", () => {
		const postMessage = jest.fn();
		const replace = jest.fn();
		const stash = jest.fn();

		const handled = handleOAuthCallback({
			parsed: null,
			hasOpener: false,
			origin: "https://game.example",
			currentPath: "https://game.example/mana-battle",
			postMessage,
			close: jest.fn(),
			replaceHashWithPath: replace,
			stashToken: stash,
		});

		expect(handled).toBe(false);
		expect(postMessage).not.toHaveBeenCalled();
		expect(replace).not.toHaveBeenCalled();
		expect(stash).not.toHaveBeenCalled();
	});
});

describe("itchAuth client", () => {
	beforeEach(() => {
		// Reset the boot-capture stash between tests.
		consumeStashedToken();
	});

	it("logs in via POST /api/v1/auth/itch and persists the session", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const client = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				readQueryToken: () => "jwt-token",
			})
		);

		const session = await client.loginWithItch();

		expect(session.token).toBe("opaque-bearer-token");
		expect(session.player.provider).toBe("itch");
		expect(session.player.providerId).toBe("1994");
		expect(client.getBearerToken()).toBe("opaque-bearer-token");
		expect(client.getStoredSession()).toEqual(session);
		expect(storage.getItem(AUTH_STORAGE_KEY)).toContain("opaque-bearer-token");

		// Request shape: server URL + JSON body with just the itch token.
		const [url, init] = callsOf(fetchMock)[0];
		expect(url).toBe(`${DEFAULT_SERVER_URL}/api/v1/auth/itch`);
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({ token: "jwt-token" });
	});

	it("opens the OAuth popup synchronously and posts the returned token", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const openWindow = jest.fn((_url: string) => ({}) as Window);
		const waitForPopupMessage = jest.fn(async (state: string) => {
			expect(state).toBe("nonce-123"); // state-nonce verified by the caller
			return "popup-token";
		});
		const client = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				openWindow: openWindow as unknown as (url: string) => Window | null,
				waitForPopupMessage: waitForPopupMessage as unknown as (
					state: string,
					timeoutMs?: number
				) => Promise<string>,
			})
		);

		const session = await client.loginWithItch();

		expect(openWindow).toHaveBeenCalledTimes(1);
		const [popupUrl] = openWindow.mock.calls[0];
		expect(popupUrl).toContain("client_id=client-1");
		expect(popupUrl).toContain("state=nonce-123");
		expect(waitForPopupMessage).toHaveBeenCalledWith("nonce-123", DEFAULT_POPUP_TIMEOUT_MS);

		const [, init] = callsOf(fetchMock)[0];
		expect(JSON.parse(init.body as string)).toEqual({ token: "popup-token" });
		expect(session.player.provider).toBe("itch");
	});

	it("on Android routes through the system browser + relay deep link", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const runOAuthAndroid = jest.fn(async (_url: string, _opts: unknown) => {
			return "android-token";
		});
		const client = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				isAndroid: () => true,
				android: {
					runOAuthAndroid,
				} as unknown as ItchAuthDeps["android"],
			})
		);

		const session = await client.loginWithItch();

		expect(runOAuthAndroid).toHaveBeenCalledTimes(1);
		const [authUrl, opts] = runOAuthAndroid.mock.calls[0];
		// The authorize URL points at the game server's OAuth relay page, not
		// the WebView's own origin (popups cannot work inside Capacitor).
		expect(authUrl).toContain(
			`redirect_uri=${encodeURIComponent(`${DEFAULT_SERVER_URL}/oauth/callback`)}`
		);
		expect(authUrl).toContain("state=nonce-123");
		expect((opts as { state: string }).state).toBe("nonce-123");

		const [, init] = callsOf(fetchMock)[0];
		expect(JSON.parse(init.body as string)).toEqual({ token: "android-token" });
		expect(session.player.provider).toBe("itch");
	});

	it("falls back to a top-level redirect via the stable relay callback", async () => {
		const redirect = jest.fn((_url: string) => {});
		const client = createItchAuthClient(
			baseDeps({
				openWindow: () => null,
				redirect: redirect as unknown as (url: string) => void,
			})
		);

		await expect(client.loginWithItch()).rejects.toThrow(/popup was blocked/);
		expect(redirect).toHaveBeenCalledTimes(1);
		const [redirectUrl] = redirect.mock.calls[0];
		expect(redirectUrl).toContain("client_id=client-1");
		// The callback is the stable relay page — never the (deploy-changing)
		// page the game happens to run at.
		expect(redirectUrl).toContain(
			`redirect_uri=${encodeURIComponent(`${DEFAULT_SERVER_URL}/oauth/callback`)}`
		);
		// …and the state carries the nonce + the game URL so the relay can
		// send the browser back here with the token hash.
		const gameUrl = window.location.origin + window.location.pathname;
		expect(redirectUrl).toContain(`state=nonce-123%7C${encodeURIComponent(gameUrl)}`);
	});

	it("accepts the relay page's cross-origin return (web popup)", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const client = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				// Opt out of the injected mock so the default listener runs
				// (it validates the relay origin + state nonce on window).
				waitForPopupMessage: undefined,
			})
		);

		const login = client.loginWithItch();

		// The relay page (same origin as the game server) posts the raw hash
		// payload to the opener.
		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "http://127.0.0.1:8787",
				data: {
					type: "mana-oauth-return",
					payload: "access_token=relay-token&state=nonce-123",
				},
			})
		);

		const session = await login;
		const [, init] = callsOf(fetchMock)[0];
		expect(JSON.parse(init.body as string)).toEqual({ token: "relay-token" });
		expect(session.player.provider).toBe("itch");
	});

	it("ignores relay messages from the wrong origin or with a mismatched state", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const client = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				waitForPopupMessage: undefined,
			})
		);

		const login = client.loginWithItch();

		// Wrong origin, right payload — must be ignored.
		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "https://evil.example.com",
				data: {
					type: "mana-oauth-return",
					payload: "access_token=evil-token&state=nonce-123",
				},
			})
		);
		// Right origin, wrong state — must be ignored.
		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "http://127.0.0.1:8787",
				data: {
					type: "mana-oauth-return",
					payload: "access_token=other-token&state=other-nonce",
				},
			})
		);
		// Right origin + state — resolves the login.
		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "http://127.0.0.1:8787",
				data: {
					type: "mana-oauth-return",
					payload: "access_token=relay-token&state=nonce-123",
				},
			})
		);

		const session = await login;
		const [, init] = callsOf(fetchMock)[0];
		expect(JSON.parse(init.body as string)).toEqual({ token: "relay-token" });
		expect(session.player.provider).toBe("itch");
	});

	it("treats a relay return without a token as a cancellation", async () => {
		const storage = createMemoryStorage();
		const client = createItchAuthClient(
			baseDeps({
				storage,
				waitForPopupMessage: undefined,
			})
		);

		const login = client.loginWithItch();

		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "http://127.0.0.1:8787",
				data: {
					type: "mana-oauth-return",
					payload: "error=access_denied&state=nonce-123",
				},
			})
		);

		await expect(login).rejects.toThrow(/cancelled/);
	});

	it("consumes a token stashed by a top-level redirect return", async () => {
		// Simulate the boot capture on the returned page.
		window.location.hash = "#access_token=stashed-token&state=returned";
		expect(handleOAuthCallbackIfPresent()).toBe(false); // boot normally
		expect(window.location.hash).toBe(""); // token scrubbed from the URL

		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const openWindow = jest.fn();
		const client = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				openWindow: openWindow as unknown as (url: string) => Window | null,
			})
		);

		const session = await client.loginWithItch();

		// No popup needed — the stashed token is used directly.
		expect(openWindow).not.toHaveBeenCalled();
		const [, init] = callsOf(fetchMock)[0];
		expect(JSON.parse(init.body as string)).toEqual({ token: "stashed-token" });
		expect(session.player.provider).toBe("itch");
	});

	it("reuses a stored server session without opening a popup", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const first = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				readQueryToken: () => "tok",
			})
		);
		await first.loginWithItch();

		const openWindow = jest.fn();
		const second = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				openWindow: openWindow as unknown as (url: string) => Window | null,
			})
		);

		const session = await second.loginWithItch();
		expect(session.token).toBe("opaque-bearer-token");
		expect(openWindow).not.toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledTimes(1); // only the first login POSTed
	});

	it("throws when the server rejects the token and does not persist", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock({
			ok: false,
			status: 401,
			body: { error: "invalid_itch_token", message: "Bad token" },
		});
		const client = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				readQueryToken: () => "garbage",
			})
		);

		await expect(client.loginWithItch()).rejects.toThrow(/invalid_itch_token/);
		expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
	});

	it("throws when no itch client id is configured", async () => {
		const client = createItchAuthClient(baseDeps({ clientId: "" }));
		expect(client.isConfigured()).toBe(false);

		await expect(client.loginWithItch()).rejects.toThrow(/not configured/);
	});

	it("treats a corrupt stored entry as logged out", () => {
		const storage = createMemoryStorage();
		storage.setItem(AUTH_STORAGE_KEY, "{not json");
		const client = createItchAuthClient(baseDeps({ storage }));
		expect(client.getStoredSession()).toBeNull();
		expect(client.getBearerToken()).toBeNull();
	});

	it("clearSession removes the persisted session", async () => {
		const storage = createMemoryStorage();
		const client = createItchAuthClient(baseDeps({ storage, readQueryToken: () => "tok" }));
		await client.loginWithItch();
		expect(client.getBearerToken()).not.toBeNull();

		client.clearSession();
		expect(client.getBearerToken()).toBeNull();
		expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
	});

	it("getCredential ignores the stored session and never hits the server", async () => {
		const storage = createMemoryStorage();
		storage.setItem(
			AUTH_STORAGE_KEY,
			JSON.stringify({
				token: "guest-bearer-token",
				player: { playerId: "p1", provider: "guest", providerId: "g1" },
			})
		);
		const fetchMock = createFetchMock();
		const client = createItchAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				readQueryToken: () => "connect-token",
			})
		);

		await expect(client.getCredential()).resolves.toBe("connect-token");
		expect(fetchMock).not.toHaveBeenCalled();
		// The guest session is untouched — conversion (not login) owns it.
		expect(JSON.parse(storage.getItem(AUTH_STORAGE_KEY) ?? "{}").token).toBe("guest-bearer-token");
	});
});
