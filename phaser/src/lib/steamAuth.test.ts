import {
	AUTH_STORAGE_KEY,
	createSteamAuthClient,
	DEFAULT_SERVER_URL,
	STEAM_APP_ID,
	STEAM_IDENTITY,
} from "./steamAuth";
import type { StorageProvider } from "@Systems/Storage";

/**
 * Unit tests for the client Steam login flow (plan.md task 12).
 *
 * Uses the injectable deps of `createSteamAuthClient` (fake storage + mocked
 * fetch + stubbed ticket hook) so no Electron/Steam environment is needed.
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
						provider: "steam",
						providerId: "76561198000000000",
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

describe("steamAuth client", () => {
	// Login tests stub the preload hook availability; jsdom has no window.auth.
	const steamAvailable = () => true;

	it("logs in via POST /api/v1/auth/steam and persists the session", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const client = createSteamAuthClient({
			storage,
			fetch: fetchMock as unknown as typeof fetch,
			getTicket: async () => "deadbeef",
			getDisplayName: () => "Momo",
			isSteamAvailable: steamAvailable,
		});

		const session = await client.loginWithSteam();

		expect(session.token).toBe("opaque-bearer-token");
		expect(session.player.providerId).toBe("76561198000000000");
		expect(client.getBearerToken()).toBe("opaque-bearer-token");
		expect(client.getStoredSession()).toEqual(session);

		// Persisted under the auth key via the storage provider.
		expect(storage.getItem(AUTH_STORAGE_KEY)).toContain("opaque-bearer-token");

		// Request shape: server URL, JSON body with ticket/identity/appId/displayName.
		const [url, init] = callsOf(fetchMock)[0];
		expect(url).toBe(`${DEFAULT_SERVER_URL}/api/v1/auth/steam`);
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({
			ticket: "deadbeef",
			identity: STEAM_IDENTITY,
			appId: STEAM_APP_ID,
			displayName: "Momo",
		});
	});

	it("honors an explicit serverUrl and appId", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const client = createSteamAuthClient({
			storage,
			fetch: fetchMock as unknown as typeof fetch,
			getTicket: async () => "deadbeef",
			isSteamAvailable: steamAvailable,
			serverUrl: "https://mp.example.com",
			appId: 4233280,
		});

		await client.loginWithSteam();

		const [url, init] = callsOf(fetchMock)[0];
		expect(url).toBe("https://mp.example.com/api/v1/auth/steam");
		expect(JSON.parse(init.body as string)).toEqual({
			ticket: "deadbeef",
			identity: STEAM_IDENTITY,
			appId: 4233280,
		});
	});

	it("omits displayName when the persona is unavailable", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const client = createSteamAuthClient({
			storage,
			fetch: fetchMock as unknown as typeof fetch,
			getTicket: async () => "deadbeef",
			getDisplayName: () => undefined,
			isSteamAvailable: steamAvailable,
		});

		await client.loginWithSteam();

		const [, init] = callsOf(fetchMock)[0];
		expect(JSON.parse(init.body as string)).toEqual({
			ticket: "deadbeef",
			identity: STEAM_IDENTITY,
			appId: STEAM_APP_ID,
		});
	});

	it("throws when no Steam ticket can be obtained", async () => {
		const storage = createMemoryStorage();
		const client = createSteamAuthClient({
			storage,
			fetch: createFetchMock() as unknown as typeof fetch,
			getTicket: async () => null,
			isSteamAvailable: steamAvailable,
		});

		await expect(client.loginWithSteam()).rejects.toThrow(/Failed to obtain a Steam auth ticket/);
		expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
	});

	it("throws when the server rejects the login and does not persist", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock({
			ok: false,
			status: 401,
			body: { error: "invalid_steam_ticket", message: "Bad ticket" },
		});
		const client = createSteamAuthClient({
			storage,
			fetch: fetchMock as unknown as typeof fetch,
			getTicket: async () => "deadbeef",
			isSteamAvailable: steamAvailable,
		});

		await expect(client.loginWithSteam()).rejects.toThrow(/invalid_steam_ticket/);
		expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
	});

	it("getBearerToken returns null when nothing is stored", () => {
		const client = createSteamAuthClient({ storage: createMemoryStorage() });
		expect(client.getBearerToken()).toBeNull();
		expect(client.getStoredSession()).toBeNull();
	});

	it("treats a corrupt stored entry as logged out", () => {
		const storage = createMemoryStorage();
		storage.setItem(AUTH_STORAGE_KEY, "{not json");
		const client = createSteamAuthClient({ storage });
		expect(client.getStoredSession()).toBeNull();
		expect(client.getBearerToken()).toBeNull();
	});

	it("clearSession removes the persisted session", async () => {
		const storage = createMemoryStorage();
		const client = createSteamAuthClient({
			storage,
			fetch: createFetchMock() as unknown as typeof fetch,
			getTicket: async () => "deadbeef",
			isSteamAvailable: steamAvailable,
		});

		await client.loginWithSteam();
		expect(client.getBearerToken()).not.toBeNull();

		client.clearSession();
		expect(client.getBearerToken()).toBeNull();
		expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
	});

	it("isSteamAvailable is false when the preload hook is absent", () => {
		// jsdom has no Electron preload → window.auth / window.steamworks are gone.
		const client = createSteamAuthClient({ storage: createMemoryStorage() });
		expect(client.isSteamAvailable()).toBe(false);
	});
});
