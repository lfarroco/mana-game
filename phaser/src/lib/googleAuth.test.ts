import {
	buildGoogleAuthUrl,
	createGoogleAuthClient,
	DEFAULT_OAUTH_TIMEOUT_MS,
	GOOGLE_AUTH_URL,
	GOOGLE_SCOPE,
} from "./googleAuth";
import { AUTH_STORAGE_KEY, DEFAULT_SERVER_URL } from "./authSession";
import type { StorageProvider } from "@Systems/Storage";

/**
 * Unit tests for the client Google sign-in flow (docs/android-multiplayer.md).
 *
 * Uses the injectable deps of `createGoogleAuthClient` (fake storage + mocked
 * fetch + stubbed Android OAuth transport) so no real browser, Google account,
 * or Capacitor plugins are needed.
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
						playerId: "9a4f0a1a-0000-4000-8000-000000000002",
						provider: "google",
						providerId: "112233445566778899000",
						displayName: "Momo Player",
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

/** Fake Android transport — records the opened URL and returns a credential. */
function createAndroidTransport(credential = "google-id-token") {
	const runOAuthAndroid = jest.fn(async (_url: string, _opts: unknown) => credential);
	return { runOAuthAndroid };
}

/** Base deps for login tests: configured client id, Android platform. */
function baseDeps(overrides: Partial<Parameters<typeof createGoogleAuthClient>[0]> = {}) {
	const android = createAndroidTransport();
	return {
		storage: createMemoryStorage(),
		fetch: createFetchMock() as unknown as typeof fetch,
		serverUrl: DEFAULT_SERVER_URL,
		clientId: "mana-battle.apps.googleusercontent.com",
		redirectUri: `${DEFAULT_SERVER_URL}/oauth/callback`,
		android,
		isAndroid: () => true,
		openWindow: (() => ({}) as Window) as (url: string) => Window | null,
		waitForPopupMessage: (async (state: string) => state) as (
			state: string,
			timeoutMs?: number
		) => Promise<string>,
		generateState: () => "state-123",
		timeoutMs: DEFAULT_OAUTH_TIMEOUT_MS,
		...overrides,
	} as Parameters<typeof createGoogleAuthClient>[0];
}

describe("buildGoogleAuthUrl", () => {
	it("builds the Google OAuth authorize URL with the OIDC implicit-flow params", () => {
		const url = buildGoogleAuthUrl({
			clientId: "mana-battle.apps.googleusercontent.com",
			redirectUri: "https://api.manabattle.com/oauth/callback",
			state: "abc",
			nonce: "def",
		});
		const parsed = new URL(url);
		expect(parsed.origin + parsed.pathname).toBe(GOOGLE_AUTH_URL);
		expect(parsed.searchParams.get("client_id")).toBe("mana-battle.apps.googleusercontent.com");
		expect(parsed.searchParams.get("scope")).toBe(GOOGLE_SCOPE);
		expect(parsed.searchParams.get("response_type")).toBe("id_token");
		expect(parsed.searchParams.get("redirect_uri")).toBe(
			"https://api.manabattle.com/oauth/callback"
		);
		expect(parsed.searchParams.get("state")).toBe("abc");
		expect(parsed.searchParams.get("nonce")).toBe("def");
	});
});

describe("googleAuth client", () => {
	it("logs in via POST /api/v1/auth/google and persists the session", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const android = createAndroidTransport("id-token-1");
		const client = createGoogleAuthClient(
			baseDeps({ storage, fetch: fetchMock as unknown as typeof fetch, android })
		);

		const session = await client.loginWithGoogle();

		expect(session.token).toBe("opaque-bearer-token");
		expect(session.player.provider).toBe("google");
		expect(session.player.providerId).toBe("112233445566778899000");
		expect(client.getBearerToken()).toBe("opaque-bearer-token");
		expect(client.getStoredSession()).toEqual(session);
		expect(storage.getItem(AUTH_STORAGE_KEY)).toContain("opaque-bearer-token");

		// The Android transport opened the authorize URL with the relay redirect.
		expect(android.runOAuthAndroid).toHaveBeenCalledTimes(1);
		const [authUrl, opts] = android.runOAuthAndroid.mock.calls[0];
		expect(authUrl).toContain("client_id=mana-battle.apps.googleusercontent.com");
		expect(authUrl).toContain(
			`redirect_uri=${encodeURIComponent(`${DEFAULT_SERVER_URL}/oauth/callback`)}`
		);
		expect(authUrl).toContain("state=state-123");
		expect((opts as { state: string }).state).toBe("state-123");

		// Request shape: server URL + JSON body with just the ID token.
		const [url, init] = callsOf(fetchMock)[0];
		expect(url).toBe(`${DEFAULT_SERVER_URL}/api/v1/auth/google`);
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({ idToken: "id-token-1" });
	});

	it("reuses a stored server session without opening the browser", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const android = createAndroidTransport();
		const first = createGoogleAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				android,
			})
		);
		await first.loginWithGoogle();

		const second = createGoogleAuthClient(
			baseDeps({ storage, fetch: fetchMock as unknown as typeof fetch, android })
		);

		const session = await second.loginWithGoogle();
		expect(session.token).toBe("opaque-bearer-token");
		expect(android.runOAuthAndroid).toHaveBeenCalledTimes(1); // only the first login opened the browser
		expect(fetchMock).toHaveBeenCalledTimes(1); // only the first login POSTed
	});

	it("throws when no Google client id is configured", async () => {
		const client = createGoogleAuthClient(baseDeps({ clientId: "" }));
		expect(client.isConfigured()).toBe(false);

		await expect(client.loginWithGoogle()).rejects.toThrow(/not configured/);
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
		const android = createAndroidTransport("connect-id-token");
		const client = createGoogleAuthClient(
			baseDeps({ storage, fetch: fetchMock as unknown as typeof fetch, android })
		);

		await expect(client.getCredential()).resolves.toBe("connect-id-token");
		expect(fetchMock).not.toHaveBeenCalled();
		// The guest session is untouched — conversion (not login) owns it.
		expect(JSON.parse(storage.getItem(AUTH_STORAGE_KEY) ?? "{}").token).toBe("guest-bearer-token");
	});

	it("logs in on web via the OAuth popup + relay message", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const openWindow = jest.fn((_url: string) => ({}) as Window);
		const client = createGoogleAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				isAndroid: () => false,
				openWindow: openWindow as unknown as (url: string) => Window | null,
				// Opt out of the injected mock so the default listener runs
				// (it validates the relay origin + state nonce on window).
				waitForPopupMessage: undefined,
			})
		);

		const login = client.loginWithGoogle();

		expect(openWindow).toHaveBeenCalledTimes(1);
		const [authUrl] = openWindow.mock.calls[0];
		expect(authUrl).toContain("client_id=mana-battle.apps.googleusercontent.com");
		expect(authUrl).toContain("response_type=id_token");
		expect(authUrl).toContain("state=state-123");
		expect(authUrl).toContain("nonce=state-123");
		expect(authUrl).toContain(
			`redirect_uri=${encodeURIComponent(`${DEFAULT_SERVER_URL}/oauth/callback`)}`
		);

		// The relay page (same origin as the game server) posts the hash.
		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "http://127.0.0.1:8787",
				data: {
					type: "mana-oauth-return",
					payload: "id_token=web-id-token&state=state-123",
				},
			})
		);

		const session = await login;
		const [, init] = callsOf(fetchMock)[0];
		expect(JSON.parse(init.body as string)).toEqual({ idToken: "web-id-token" });
		expect(session.player.provider).toBe("google");
	});

	it("ignores web relay messages from the wrong origin or with a mismatched state", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const client = createGoogleAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
				isAndroid: () => false,
				waitForPopupMessage: undefined,
			})
		);

		const login = client.loginWithGoogle();

		// Wrong origin, right payload — must be ignored.
		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "https://evil.example.com",
				data: {
					type: "mana-oauth-return",
					payload: "id_token=evil-token&state=state-123",
				},
			})
		);
		// Right origin, wrong state — must be ignored.
		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "http://127.0.0.1:8787",
				data: {
					type: "mana-oauth-return",
					payload: "id_token=other-token&state=other-state",
				},
			})
		);
		// Right origin + state — resolves the login.
		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "http://127.0.0.1:8787",
				data: {
					type: "mana-oauth-return",
					payload: "id_token=web-id-token&state=state-123",
				},
			})
		);

		const session = await login;
		const [, init] = callsOf(fetchMock)[0];
		expect(JSON.parse(init.body as string)).toEqual({ idToken: "web-id-token" });
		expect(session.player.provider).toBe("google");
	});

	it("treats a web relay return without an ID token as a cancellation", async () => {
		const storage = createMemoryStorage();
		const client = createGoogleAuthClient(
			baseDeps({
				storage,
				isAndroid: () => false,
				waitForPopupMessage: undefined,
			})
		);

		const login = client.loginWithGoogle();

		window.dispatchEvent(
			new MessageEvent("message", {
				origin: "http://127.0.0.1:8787",
				data: {
					type: "mana-oauth-return",
					payload: "error=access_denied&state=state-123",
				},
			})
		);

		await expect(login).rejects.toThrow(/cancelled/);
	});

	it("reports a blocked popup on web", async () => {
		const client = createGoogleAuthClient(
			baseDeps({
				isAndroid: () => false,
				openWindow: (() => null) as unknown as (url: string) => Window | null,
			})
		);

		await expect(client.loginWithGoogle()).rejects.toThrow(/popup was blocked/);
	});

	it("throws when the server rejects the ID token and does not persist", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock({
			ok: false,
			status: 401,
			body: { error: "invalid_google_token", message: "Bad token" },
		});
		const client = createGoogleAuthClient(
			baseDeps({
				storage,
				fetch: fetchMock as unknown as typeof fetch,
			})
		);

		await expect(client.loginWithGoogle()).rejects.toThrow(/invalid_google_token/);
		expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
	});

	it("treats a corrupt stored entry as logged out", () => {
		const storage = createMemoryStorage();
		storage.setItem(AUTH_STORAGE_KEY, "{not json");
		const client = createGoogleAuthClient(baseDeps({ storage }));
		expect(client.getStoredSession()).toBeNull();
		expect(client.getBearerToken()).toBeNull();
	});

	it("clearSession removes the persisted session", async () => {
		const storage = createMemoryStorage();
		const client = createGoogleAuthClient(baseDeps({ storage }));
		await client.loginWithGoogle();
		expect(client.getBearerToken()).not.toBeNull();

		client.clearSession();
		expect(client.getBearerToken()).toBeNull();
		expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
	});
});
