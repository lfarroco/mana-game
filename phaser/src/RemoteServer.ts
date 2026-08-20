/**
 * RemoteServer — HTTP adapter for the Node game server (`server/`).
 *
 * Implements the client's `ServerAdapter` interface (see GameServer.ts) for
 * multiplayer sessions by talking to the REST API at `MANA_SERVER_URL`
 * (default `http://127.0.0.1:8787`, docs/game-server.md). Replaces the
 * retired Supabase edge-function client.
 *
 * Auth: every request carries `Authorization: Bearer <token>`, where the
 * token comes from the shared auth session store (`src/lib/authSession.ts` —
 * `getBearerToken()` reads the persisted `{ token, player }` session written
 * by either the Steam (Electron) or itch.io (web) login flow). No token → the
 * adapter rejects: multiplayer requires a login.
 *
 * Wire format: combat states cross the wire as a JSON-safe `CombatStateDto`
 * (core `CombatCodec`); this adapter decodes them back into a full
 * `CombatState` (rebuilding the `unitById` Map and derived fields) so the
 * battleground can play them back unchanged.
 *
 * The factory (`createRemoteServer`) accepts an injectable fetch, base URL,
 * and token provider so tests can mock the HTTP layer exactly like the server
 * tests inject `steamFetch` / `itchFetch`.
 */

import { deserializeCombatState, type CombatStateDto } from "@game/Combat/CombatCodec";
import * as Models from "@game/Models";
import { DEFAULT_SERVER_URL, authSession, readServerUrl } from "./lib/authSession";

// Re-export the default server URL so callers/tests share one source of truth.
export { DEFAULT_SERVER_URL };

/** Request queue type sent on session creation (no ranked UI yet — server defaults to casual). */
const DEFAULT_QUEUE_TYPE = "casual" as const;

/**
 * Error thrown for non-2xx API responses. Carries the HTTP status and the
 * server's machine-readable `error` code so callers can branch (e.g. 401 →
 * re-authenticate).
 */
export class RemoteServerError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = "RemoteServerError";
		this.status = status;
		this.code = code;
	}
}

export type RemoteServerDeps = {
	/** Injectable fetch (defaults to `globalThis.fetch`) — mirrors server test injection. */
	fetch?: typeof globalThis.fetch;
	/** Game-server base URL (defaults to `MANA_SERVER_URL` or `http://127.0.0.1:8787`). */
	serverUrl?: string;
	/** Bearer token provider (defaults to the persisted auth-session store). */
	getBearerToken?: () => string | null;
};

export type RemoteServer = {
	createSession(playerId: string, crystalId: string): Promise<Models.SessionData>;
	handleAction(playerId: string, action: Models.Action): Promise<Models.ActionResponse>;
	/** Resume/reconnect: the current session, or null when none is active. */
	getSession(playerId: string): Promise<Models.SessionData | null>;
	getPhaseOptions(playerId: string): Promise<Models.PhaseOptions>;
	/**
	 * Multiplayer-lobby profile: identity, rating, career + season victory
	 * counts, and whether a resumable session exists (`GET /api/v1/players/me`).
	 */
	getProfile(playerId: string): Promise<MultiplayerProfile>;
};

/** Tiered victory counts from the lobby profile endpoint. */
export type MultiplayerVictoryCounts = {
	bronze: number;
	silver: number;
	gold: number;
};

/**
 * Payload of `GET /api/v1/players/me` (server `playerService.ts`). `season`
 * counts victories completed since the 1st of the current month (UTC).
 */
export type MultiplayerProfile = {
	player: {
		playerId: string;
		displayName?: string;
		/** Provider-scoped identity (steam64 / itch username) — the name fallback. */
		providerId: string;
		provider: string;
	};
	rating: number;
	career: MultiplayerVictoryCounts;
	season: MultiplayerVictoryCounts;
	hasActiveSession: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** Shape-guard for the wire `CombatStateDto` (see core CombatCodec). */
function isCombatStateDto(value: unknown): value is CombatStateDto {
	if (!isRecord(value)) return false;
	return (
		Array.isArray(value.units) &&
		Array.isArray(value.logs) &&
		Array.isArray(value.finalPlayerUnits) &&
		typeof value.wonCombat === "boolean" &&
		typeof value.enemyPlayerName === "string"
	);
}

/** Shape-guard for the lobby profile payload (`GET /api/v1/players/me`). */
function isMultiplayerProfile(value: unknown): value is MultiplayerProfile {
	if (!isRecord(value)) return false;
	const player = isRecord(value.player) ? value.player : {};
	return (
		typeof player.playerId === "string" &&
		typeof player.providerId === "string" &&
		typeof value.rating === "number" &&
		isVictoryCounts(value.career) &&
		isVictoryCounts(value.season) &&
		typeof value.hasActiveSession === "boolean"
	);
}

function isVictoryCounts(value: unknown): value is MultiplayerVictoryCounts {
	if (!isRecord(value)) return false;
	return (
		typeof value.bronze === "number" &&
		typeof value.silver === "number" &&
		typeof value.gold === "number"
	);
}

/** Decode a wire `CombatStateDto` into a full in-memory `CombatState`. */
function decodeCombatState(value: unknown): Models.CombatState | undefined {
	return isCombatStateDto(value) ? deserializeCombatState(value) : undefined;
}

/**
 * Decode a wire session payload into a `SessionData`. The server always
 * strips the raw (Map-carrying) combat state; while in the `combat` phase it
 * ships a serialized `CombatStateDto` under `combatState` instead — decode
 * that back into the in-memory shape the client expects.
 */
function decodeSession(raw: unknown): Models.SessionData {
	if (!isRecord(raw)) {
		throw new Error("Game server returned an unexpected session payload");
	}

	const { combatState, ...rest } = raw;
	const decoded = decodeCombatState(combatState);
	const session = rest as unknown as Models.SessionData;
	return decoded ? { ...session, combatState: decoded } : session;
}

/**
 * Map a non-2xx response to a useful error, parsing the server's
 * `{ error, message }` JSON shape (server/src/errors.ts). 401s get a
 * re-authentication hint since they mean the persisted bearer token is
 * missing, unknown, or expired.
 */
async function parseErrorResponse(res: Response): Promise<RemoteServerError> {
	let code = `HTTP ${res.status}`;
	let message = `Request failed with status ${res.status}`;

	try {
		const body = (await res.json()) as unknown;
		if (isRecord(body)) {
			if (typeof body.error === "string" && body.error !== "") code = body.error;
			if (typeof body.message === "string" && body.message !== "") message = body.message;
		}
	} catch {
		// Non-JSON error body — keep the defaults.
	}

	if (res.status === 401) {
		return new RemoteServerError(
			res.status,
			code,
			`Multiplayer login expired — please re-authenticate (${code})`,
		);
	}
	return new RemoteServerError(res.status, code, `${code}: ${message}`);
}

/**
 * Build the RemoteServer HTTP adapter. All deps are optional and default to
 * the production wiring (global fetch, env-configured URL, steamAuth token).
 */
export function createRemoteServer(deps: RemoteServerDeps = {}): RemoteServer {
	const fetchImpl = deps.fetch ?? globalThis.fetch;
	const serverUrl = deps.serverUrl ?? readServerUrl();
	const getToken = deps.getBearerToken ?? (() => authSession.getBearerToken());

	const requireToken = (): string => {
		const token = getToken();
		if (!token || token === "") {
			throw new Error(
				"Multiplayer requires a login — no bearer token available. Log in first (steamAuth.loginWithSteam on Electron, or itchAuth.loginWithItch on web).",
			);
		}
		return token;
	};

	const request = async (
		path: string,
		init: { method: "GET" | "POST"; body?: unknown },
	): Promise<unknown> => {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${requireToken()}`,
		};
		if (init.body !== undefined) headers["Content-Type"] = "application/json";

		let res: Response;
		try {
			res = await fetchImpl(`${serverUrl}${path}`, {
				method: init.method,
				headers,
				body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
			});
		} catch (err) {
			const detail = err instanceof Error ? err.message : String(err);
			throw new Error(`Game server request failed: ${detail}`);
		}

		if (!res.ok) throw await parseErrorResponse(res);
		if (res.status === 204) return undefined;
		return (await res.json()) as unknown;
	};


	const getSession = async (_playerId: string): Promise<Models.SessionData | null> => {
		try {
			const payload = await request("/api/v1/sessions/current", { method: "GET" });
			return decodeSession(payload);
		} catch (err) {
			// No active session → null (resume finds nothing to resume).
			if (err instanceof RemoteServerError && err.status === 404) return null;
			throw err;
		}
	};

	const getPhaseOptions = async (_playerId: string): Promise<Models.PhaseOptions> => {
		const session = await getSession(_playerId);
		if (!session) {
			throw new Error("No active multiplayer session");
		}
		return {
			phase: session.phase,
			round: session.round,
			options: session.options,
			team: session.team,
			wins: session.wins,
			losses: session.losses,
			runStats: session.runStats,
			combatState: session.combatState,
		};
	};

	return {
		async createSession(_playerId: string, crystalId: string): Promise<Models.SessionData> {
			// The server generates the seed (it is the replay authority) — the
			// client never sends one. queueType: no ranked UI yet → casual.
			const payload = await request("/api/v1/sessions", {
				method: "POST",
				body: { crystalId, queueType: DEFAULT_QUEUE_TYPE },
			});
			return decodeSession(payload);
		},

		async handleAction(
			_playerId: string,
			action: Models.Action,
		): Promise<Models.ActionResponse> {
			const payload = await request("/api/v1/sessions/current/actions", {
				method: "POST",
				body: { action },
			});
			const record = isRecord(payload) ? payload : {};
			return {
				session: decodeSession(record.session),
				combatState: decodeCombatState(record.combatState),
			};
		},

		getSession,
		getPhaseOptions,

		async getProfile(_playerId: string): Promise<MultiplayerProfile> {
			const payload = await request("/api/v1/players/me", { method: "GET" });
			if (!isMultiplayerProfile(payload)) {
				throw new Error("Game server returned an unexpected profile payload");
			}
			return payload;
		},
	};
}

/** Default adapter wired to the real fetch, env URL, and steamAuth token. */
export const remoteServer: RemoteServer = createRemoteServer();

