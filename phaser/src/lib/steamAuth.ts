/**
 * Client-side Steam login flow (plan.md task 12, docs/auth.md "Steam
 * auto-login (Electron)").
 *
 * The Electron preload exposes `window.auth.getSteamAuthTicket` (ticket as a
 * hex string). This module POSTs it to the game server's
 * `POST /api/v1/auth/steam`, then persists the issued `{ token, player }`
 * through the existing storage provider so Phase 3's `RemoteServer` rewrite
 * can authenticate every request with `Authorization: Bearer <token>`.
 *
 * Steam-only this phase: `loginWithSteam` throws when Steam is unavailable so
 * multiplayer entry can fall back to single-player. The bearer token is a
 * credential — it is persisted but never logged or echoed.
 */

import { storage } from "@Systems/Storage";
import type { StorageProvider } from "@Systems/Storage";
import { IS_DEMO } from "@config";

/**
 * Shared identity string that ties a Steam ticket to this server
 * (docs/auth.md). Must match `STEAM_IDENTITY` in
 * server/src/services/steamAuth.ts — keep the two in sync.
 */
export const STEAM_IDENTITY = "mana-game-v1";

/** Default game-server base URL; `MANA_SERVER_URL` (build-time env) overrides. */
export const DEFAULT_SERVER_URL = "http://127.0.0.1:8787";

/** Storage key for the persisted `{ token, player }` auth session. */
export const AUTH_STORAGE_KEY = "mana_auth_session";

/** Steam app id advertised to the server's MANA_STEAM_APP_IDS allowlist. */
export const STEAM_APP_ID = IS_DEMO ? 4233280 : 3757600;

export type SteamPlayer = {
	playerId: string;
	provider: "steam";
	providerId: string;
	displayName?: string;
};

export type SteamAuthSession = {
	token: string;
	player: SteamPlayer;
};

export type SteamAuthClient = {
	/** True when the Electron preload exposed a usable Steam client. */
	isSteamAvailable(): boolean;
	/**
	 * Full login: obtain a ticket → `POST /api/v1/auth/steam` → persist →
	 * return the session. Throws when Steam is unavailable, no ticket is
	 * produced, or the server rejects the request.
	 */
	loginWithSteam(): Promise<SteamAuthSession>;
	/** The persisted session, or null when logged out / entry is corrupt. */
	getStoredSession(): SteamAuthSession | null;
	/** Bearer token for Phase 3 RemoteServer requests (or null). */
	getBearerToken(): string | null;
	clearSession(): void;
};

export type SteamAuthDeps = {
	storage: StorageProvider;
	fetch: typeof globalThis.fetch;
	/** Returns the ticket hex string, or null when Steam is unavailable. */
	getTicket: (identity: string, timeoutMs?: number) => Promise<string | null>;
	getDisplayName: () => string | undefined;
	/** Whether the Steam client is present (defaults to the preload check). */
	isSteamAvailable: () => boolean;
	serverUrl: string;
	appId: number;
};

// Module-local window typing (repo pattern: AchievementSystem, SteamCloudProvider).
// The preload script owns the actual steamworks client; the renderer only sees
// the thin `window.auth.getSteamAuthTicket` ticket hook.
declare const window: Window & {
	auth?: {
		getSteamAuthTicket?: (
			identity: string,
			timeoutMs?: number
		) => Promise<string | null>;
	};
	steamworks?: {
		auth?: unknown;
		localplayer?: { getName?: () => string };
	};
};

function readServerUrl(): string {
	const fromEnv =
		typeof process !== "undefined" && process.env
			? process.env.MANA_SERVER_URL
			: undefined;
	return fromEnv && fromEnv.trim() !== "" ? fromEnv : DEFAULT_SERVER_URL;
}

function defaultGetTicket(
	identity: string,
	timeoutMs?: number
): Promise<string | null> {
	const getTicket = window.auth?.getSteamAuthTicket;
	if (typeof getTicket !== "function") {
		console.warn(
			"steamAuth",
			"[steamAuth] Steam auth hook not exposed (non-Electron build?)"
		);
		return Promise.resolve(null);
	}
	return getTicket(identity, timeoutMs);
}

function defaultGetDisplayName(): string | undefined {
	return window.steamworks?.localplayer?.getName?.();
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

/** Shape-validate the server's `{ player, token }` login payload. */
function parseSessionPayload(payload: unknown): SteamAuthSession {
	const body = isRecord(payload) ? payload : {};
	const player = isRecord(body.player) ? body.player : {};

	if (
		typeof body.token !== "string" ||
		body.token === "" ||
		typeof player.playerId !== "string" ||
		player.playerId === "" ||
		typeof player.providerId !== "string"
	) {
		throw new Error("Steam login returned an unexpected response shape");
	}

	return {
		token: body.token,
		player: {
			playerId: player.playerId,
			provider: "steam",
			providerId: player.providerId,
			displayName:
				typeof player.displayName === "string"
					? player.displayName
					: undefined,
		},
	};
}

export function createSteamAuthClient(
	deps: Partial<SteamAuthDeps> = {}
): SteamAuthClient {
	const provider = deps.storage ?? storage;
	const getFetch = (): typeof globalThis.fetch =>
		deps.fetch ?? defaultFetch();
	const getTicket = deps.getTicket ?? defaultGetTicket;
	const getDisplayName = deps.getDisplayName ?? defaultGetDisplayName;
	const steamAvailable =
		deps.isSteamAvailable ??
		(() =>
			typeof window.auth?.getSteamAuthTicket === "function" &&
			Boolean(window.steamworks?.auth));
	const serverUrl = deps.serverUrl ?? readServerUrl();
	const appId = deps.appId ?? STEAM_APP_ID;

	const readStored = (): SteamAuthSession | null => {
		const raw = provider.getItem(AUTH_STORAGE_KEY);
		if (!raw) return null;
		try {
			return parseSessionPayload(JSON.parse(raw));
		} catch {
			return null; // corrupt entry — treat as logged out
		}
	};

	return {
		isSteamAvailable: () => steamAvailable(),

		async loginWithSteam(): Promise<SteamAuthSession> {
			if (!steamAvailable()) {
				throw new Error(
					"Steam is not available — multiplayer login requires the Steam Electron build"
				);
			}

			const ticket = await getTicket(STEAM_IDENTITY);
			if (!ticket) {
				throw new Error("Failed to obtain a Steam auth ticket");
			}

			const body: Record<string, unknown> = {
				ticket,
				identity: STEAM_IDENTITY,
				appId,
			};
			const displayName = getDisplayName();
			if (displayName !== undefined) body.displayName = displayName;

			let res: Response;
			try {
				res = await getFetch()(`${serverUrl}/api/v1/auth/steam`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				throw new Error(`Steam login request failed: ${message}`);
			}

			let payload: unknown;
			try {
				payload = await res.json();
			} catch {
				throw new Error(`Steam login failed (HTTP ${res.status})`);
			}

			if (!res.ok) {
				const code =
					isRecord(payload) && typeof payload.error === "string"
						? payload.error
						: `HTTP ${res.status}`;
				throw new Error(`Steam login rejected by the server (${code})`);
			}

			const session = parseSessionPayload(payload);
			// Never log the token — it is a bearer credential (docs/auth.md).
			provider.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
			return session;
		},

		getStoredSession: readStored,
		getBearerToken: () => readStored()?.token ?? null,
		clearSession: () => provider.removeItem(AUTH_STORAGE_KEY),
	};
}

/** Default client wired to the real storage provider and preload hook. */
export const steamAuth = createSteamAuthClient();

