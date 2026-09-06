import { createGuestAuthClient } from "./guestAuth";
import { AUTH_STORAGE_KEY, DEFAULT_SERVER_URL } from "./authSession";
import type { StorageProvider } from "@Systems/Storage";

/**
 * Unit tests for the client guest login flow.
 *
 * Uses the injectable deps of `createGuestAuthClient` (fake storage + mocked
 * fetch) so no live server is needed — mirrors googleAuth.test.ts.
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
						playerId: "9a4f0a1a-0000-4000-8000-000000000003",
						provider: "guest",
						providerId: "guest-provider-id",
						displayName: "SwiftBadger07",
					},
					token: "opaque-bearer-token",
				},
		} as unknown as Response;
	});
}

describe("guestAuth client", () => {
	it("POSTs to /auth/guest with no credential and persists the session", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const client = createGuestAuthClient({
			storage,
			fetch: fetchMock as unknown as typeof fetch,
			serverUrl: DEFAULT_SERVER_URL,
		});

		const session = await client.loginAsGuest();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(`${DEFAULT_SERVER_URL}/api/v1/auth/guest`);
		expect(init.method).toBe("POST");

		expect(session.player.provider).toBe("guest");
		expect(session.player.displayName).toBe("SwiftBadger07");
		expect(session.token).toBe("opaque-bearer-token");

		const stored = storage.getItem(AUTH_STORAGE_KEY);
		expect(stored).not.toBeNull();
		expect(JSON.parse(stored ?? "{}")).toEqual(session);
		expect(client.getBearerToken()).toBe("opaque-bearer-token");
	});

	it("mints a fresh session on every call (no reuse)", async () => {
		const storage = createMemoryStorage();
		const fetchMock = createFetchMock();
		const client = createGuestAuthClient({
			storage,
			fetch: fetchMock as unknown as typeof fetch,
			serverUrl: DEFAULT_SERVER_URL,
		});

		await client.loginAsGuest();
		await client.loginAsGuest();

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("surfaces the server's rejection code", async () => {
		const fetchMock = createFetchMock({
			ok: false,
			status: 429,
			body: { error: "rate_limited", message: "slow down" },
		});
		const client = createGuestAuthClient({
			storage: createMemoryStorage(),
			fetch: fetchMock as unknown as typeof fetch,
			serverUrl: DEFAULT_SERVER_URL,
		});

		await expect(client.loginAsGuest()).rejects.toThrow(/rate_limited/);
		expect(client.getStoredSession()).toBeNull();
	});

	it("wraps network failures", async () => {
		const fetchMock = jest.fn(async () => {
			throw new Error("boom");
		});
		const client = createGuestAuthClient({
			storage: createMemoryStorage(),
			fetch: fetchMock as unknown as typeof fetch,
			serverUrl: DEFAULT_SERVER_URL,
		});

		await expect(client.loginAsGuest()).rejects.toThrow(/request failed/);
	});
});
