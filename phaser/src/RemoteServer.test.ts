import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "@game/Constants";
import type { CombatStateDto } from "@game/Combat/CombatCodec";
import * as Models from "@game/Models";
import type { Unit } from "@game/Models";
import { createRemoteServer, DEFAULT_SERVER_URL, RemoteServerError } from "./RemoteServer";

/**
 * Unit tests for the Phase 3 RemoteServer HTTP adapter.
 *
 * Uses the injectable deps of `createRemoteServer` (mocked fetch + stubbed
 * bearer token) so no live server or Steam environment is needed — mirrors
 * how the server tests inject `steamFetch` and how steamAuth.test.ts mocks
 * fetch.
 */

type FetchCall = [string, { method?: string; headers?: Record<string, string>; body?: string }];

function callsOf(fetchMock: jest.Mock): FetchCall[] {
	return fetchMock.mock.calls as FetchCall[];
}

function mockResponse(status: number, body: unknown) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	} as unknown as Response;
}

function createFetchMock(status = 200, body: unknown = {}) {
	return jest.fn(async (_url: unknown, _init: unknown) => mockResponse(status, body));
}

function makeUnit(id: string, force: string, isCore: boolean): Unit {
	return {
		id,
		cardId: isCore ? "critical_crystal" : "wisp",
		pic: "",
		force,
		position: [1, 1],
		rank: 1,
		power: 5,
		bonusPower: 0,
		life: 20,
		maxLife: 20,
		shield: 0,
		cooldown: 1,
		evade: 0,
		effects: [],
		reactions: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		silenced: 0,
		isCore,
	};
}

function createSessionData(overrides: Partial<Models.SessionData> = {}): Models.SessionData {
	return {
		id: "sess-1",
		player_id: "player-1",
		session_type: { type: "multiplayer", queueType: "casual" },
		phase: "encounter",
		round: 1,
		step: 0,
		seed: "server-seed",
		initial_seed: "server-seed",
		options: [],
		team: { units: [] },
		wins: 0,
		losses: 0,
		action_log: [],
		...overrides,
	};
}

/** A JSON-safe combat-state wire payload (CombatStateDto). */
function createCombatStateDto(): CombatStateDto {
	const playerCore = makeUnit("p-core", FORCE_ID_PLAYER, true);
	const cpuCore = makeUnit("c-core", FORCE_ID_CPU, true);
	return {
		units: [playerCore, cpuCore],
		logs: [],
		wonCombat: true,
		finalPlayerUnits: [playerCore],
		enemyPlayerName: "TestRival",
	};
}

describe("RemoteServer HTTP adapter", () => {
	it("creates a session via POST /sessions with crystalId + bearer auth and no client seed", async () => {
		const sessionBody = createSessionData();
		const fetchMock = createFetchMock(201, sessionBody);
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			getBearerToken: () => "tok-123",
		});

		const session = await server.createSession("player-1", "critical_crystal");

		const [url, init] = callsOf(fetchMock)[0];
		expect(url).toBe(`${DEFAULT_SERVER_URL}/api/v1/sessions`);
		expect(init.method).toBe("POST");
		expect(init.headers?.Authorization).toBe("Bearer tok-123");
		expect(init.headers?.["Content-Type"]).toBe("application/json");
		expect(JSON.parse(init.body as string)).toEqual({
			crystalId: "critical_crystal",
			queueType: "casual",
		});
		// The server generates the seed — the client must not send one.
		expect(JSON.parse(init.body as string).seed).toBeUndefined();

		expect(session.id).toBe("sess-1");
		expect(session.phase).toBe("encounter");
	});

	it("dispatches an action and decodes the CombatStateDto via the core codec", async () => {
		const dto = createCombatStateDto();
		const wireSession = createSessionData({
			phase: "combat",
			combatState: dto as unknown as Models.CombatState,
		});
		const fetchMock = createFetchMock(200, {
			session: { ...wireSession, combatState: dto },
			combatState: dto,
		});
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			getBearerToken: () => "tok-123",
		});

		const result = await server.handleAction("player-1", { type: "start_combat" });

		const [url, init] = callsOf(fetchMock)[0];
		expect(url).toBe(`${DEFAULT_SERVER_URL}/api/v1/sessions/current/actions`);
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({
			action: { type: "start_combat" },
		});

		// Derived indexes are rebuilt from the DTO.
		expect(result.combatState).toBeDefined();
		expect(result.combatState?.unitById).toBeInstanceOf(Map);
		expect(result.combatState?.unitById.size).toBe(2);
		expect(result.combatState?.playerCore?.force).toBe(FORCE_ID_PLAYER);
		expect(result.combatState?.cpuCore?.force).toBe(FORCE_ID_CPU);
		expect(result.combatState?.wonCombat).toBe(true);
		expect(result.combatState?.enemyPlayerName).toBe("TestRival");
		// The session carried in the response is decoded too.
		expect(result.session.combatState?.unitById).toBeInstanceOf(Map);
	});

	it("fetches the current session via GET /sessions/current for resume", async () => {
		const sessionBody = createSessionData();
		const fetchMock = createFetchMock(200, sessionBody);
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			getBearerToken: () => "tok-123",
		});

		const session = await server.getSession("player-1");

		const [url, init] = callsOf(fetchMock)[0];
		expect(url).toBe(`${DEFAULT_SERVER_URL}/api/v1/sessions/current`);
		expect(init.method).toBe("GET");
		expect(init.headers?.Authorization).toBe("Bearer tok-123");
		expect(session?.id).toBe("sess-1");
	});

	it("returns null from getSession when no session is active (404)", async () => {
		const fetchMock = createFetchMock(404, {
			error: "no_active_session",
			message: "No active session",
		});
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			getBearerToken: () => "tok-123",
		});

		await expect(server.getSession("player-1")).resolves.toBeNull();
	});

	it("never issues a session-delete request — the server owns the lifecycle", async () => {
		// A finished run: the terminal session arrives in the action response,
		// and the adapter must not send any DELETE afterwards (there is no
		// deleteSession surface at all — the client can only create, act, or
		// resume).
		const terminalSession = createSessionData({ phase: "game_over", losses: 4 });
		const fetchMock = createFetchMock(200, { session: terminalSession });
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			getBearerToken: () => "tok-123",
		});

		await server.handleAction("player-1", { type: "end_combat" });

		const calls = callsOf(fetchMock);
		expect(calls).toHaveLength(1);
		expect(calls[0][1].method).toBe("POST");
		expect(calls[0][0]).not.toMatch(/\/delete$/);
	});

	it("surfaces a clear re-authentication error on a 401", async () => {
		const fetchMock = createFetchMock(401, {
			error: "invalid_token",
			message: "Invalid or expired token",
		});
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			getBearerToken: () => "stale-token",
		});

		await expect(server.getSession("player-1")).rejects.toThrow(
			/login expired — please re-authenticate/
		);
		await expect(server.getSession("player-1")).rejects.toMatchObject({
			status: 401,
			code: "invalid_token",
		} as Partial<RemoteServerError>);
	});

	it("surfaces the server error code and message for other non-2xx responses", async () => {
		const fetchMock = createFetchMock(409, {
			error: "session_already_exists",
			message: "Player already has an active session",
		});
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			getBearerToken: () => "tok-123",
		});

		await expect(server.createSession("player-1", "critical_crystal")).rejects.toThrow(
			/session_already_exists: Player already has an active session/
		);
	});

	it("rejects before any fetch when no bearer token is available", async () => {
		const fetchMock = createFetchMock();
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			getBearerToken: () => null,
		});

		await expect(server.createSession("player-1", "critical_crystal")).rejects.toThrow(
			/Multiplayer requires Steam login/
		);
		await expect(server.handleAction("player-1", { type: "skip" })).rejects.toThrow(
			/Multiplayer requires Steam login/
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("honors an explicit serverUrl from deps", async () => {
		const sessionBody = createSessionData();
		const fetchMock = createFetchMock(201, sessionBody);
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			serverUrl: "https://mp.example.com",
			getBearerToken: () => "tok-123",
		});

		await server.createSession("player-1", "critical_crystal");

		const [url] = callsOf(fetchMock)[0];
		expect(url).toBe("https://mp.example.com/api/v1/sessions");
	});

	it("getPhaseOptions builds PhaseOptions from the current session", async () => {
		const fetchMock = createFetchMock(200, createSessionData());
		const server = createRemoteServer({
			fetch: fetchMock as unknown as typeof fetch,
			getBearerToken: () => "tok-123",
		});

		const options = await server.getPhaseOptions("player-1");
		expect(options.phase).toBe("encounter");
		expect(options.round).toBe(1);
		expect(options.options).toEqual([]);
		expect(options.team).toEqual({ units: [] });
	});
});
