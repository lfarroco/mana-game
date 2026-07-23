import * as Models from "@game/Models";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "@game/Constants";
import { CombatLogEntry } from "@game/Combat/CombatLogger";

import * as supabase from "@lib/supabase";
import { env } from "@Env";


const PLAYER_ID_STORAGE_KEY = "mana_player_id";
const PLAYER_ID_PREFIX = "player_";
const PLAYER_ID_RANDOM_MAX = 1_000_000;

// Generate a stable local player ID. Persisted to localStorage so it survives page reloads.
// Not a security token — just a client-side identifier for session association.
const storedId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
let playerId =
	storedId ||
	`${PLAYER_ID_PREFIX}${Math.floor(Math.random() * PLAYER_ID_RANDOM_MAX)}`;

if (!storedId) {
	localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
}

const generateSessionSeed = (): string => {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getSessionCombatState = (session: unknown): Models.CombatState | undefined => {
	const combatState = (session as { combatState?: unknown })?.combatState;
	if (!combatState || typeof combatState !== "object") {
		return undefined;
	}

	return combatState as Models.CombatState;
};

// export class RemoteServer implements GameServer {
// 	private playerId: string;

// 	constructor(playerId?: string) {
// 		const storedId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
// 		this.playerId =
// 			playerId ||
// 			storedId ||
// 			`${PLAYER_ID_PREFIX}${Math.floor(Math.random() * PLAYER_ID_RANDOM_MAX)}`;
// 		if (!storedId) {
// 			localStorage.setItem(PLAYER_ID_STORAGE_KEY, this.playerId);
// 		}
// 	}




export async function createSession(_playerId: string, crystalId: string): Promise<Models.SessionData> {
	const sessionType = env.state.session.session_type;
	const seed = generateSessionSeed();
	const { data, error } = await supabase.supabase.functions.invoke("action", {
		body: {
			actionId: "start_session",
			payload: { selectedCrystalId: crystalId, sessionType, seed },
		},
	});

	if (error) {
		throw new Error(`Failed to create session: ${error.message}`);
	}

	const session = { ...(data as Models.SessionData), session_type: sessionType };
	//MultiplayerManager.primeDeferredSession(session, crystalId);

	return session;
}

export async function getSession(playerId: string): Promise<Models.SessionData | null> {
	const { data, error } = await supabase.supabase
		.from("player_sessions")
		.select("*")
		.eq("player_id", playerId)
		.maybeSingle();

	if (error) {
		console.error("RemoteServer", "Failed to fetch session:", error);
		return null;
	}

	return data as Models.SessionData | null;
}

export async function getPhaseOptions(playerId: string): Promise<Models.PhaseOptions> {
	const { data: session, error } = await supabase.supabase
		.from("player_sessions")
		.select("*")
		.eq("player_id", playerId)
		.single();

	if (error || !session) {
		throw new Error(`Failed to fetch phase options: ${error?.message || "No session found"}`);
	}
	const sessionCombatState = getSessionCombatState(session)!;

	let combatState: Models.CombatState | undefined = undefined;
	if (session.phase === "combat") {
		console.debug("RemoteServer", "Using server-provided combat logs");
		const units = sessionCombatState.initialUnits;
		const finalPlayerUnits = sessionCombatState.finalPlayerUnits;
		const wonCombat = sessionCombatState.wonCombat;
		const unitById = new Map(units.map(u => [u.id, u]));
		const playerCore = units.find(u => u.isCore && u.force === FORCE_ID_PLAYER)!;
		const cpuCore = units.find(u => u.isCore && u.force === FORCE_ID_CPU)!;
		combatState = {
			units,
			logs: sessionCombatState.logs as CombatLogEntry[],
			enemyPlayerName:
				typeof sessionCombatState.enemyPlayerName === "string"
					? sessionCombatState.enemyPlayerName
					: "",
			wonCombat,
			finalPlayerUnits,
			initialUnits: units,
			unitById,
			playerCore,
			cpuCore,
			playerUnits: units.filter(u => u.force === FORCE_ID_PLAYER),
			cpuUnits: units.filter(u => u.force === FORCE_ID_CPU),
		};
	}

	const optionsList = session.current_options || [];

	return {
		phase: session.phase as Models.PhaseType,
		round: session.round,
		options: optionsList,
		team: session.team,
		wins: session.wins,
		losses: session.losses,
		combatState: combatState,
	};
}

export async function handleAction(
	_playerId: string,
	action: Models.Action
): Promise<Models.ActionResponse> {
	const bodyPayload =
		action.type === "start_combat"
			? {
				...(action || {}),
				sessionType: env.state.session.session_type,
			}
			: action;

	const response = await supabase.supabase.functions.invoke("action", {
		body: { action: bodyPayload },
	});

	if (response.error) {
		console.error("RemoteServer", `Failed to handle action ${action.type}:`, response.error);
		throw new Error(`Failed to handle action ${action.type}: ${response.error.message}`);
	}

	const nextSession = response.data as Models.SessionData;
	const combatState = getSessionCombatState(response.data);
	env.state.session = nextSession;
	return { session: nextSession, combatState };
}

/**
 * Update the player ID (e.g., after authentication)
 */
export function setPlayerId(newPlayerId: string): void {
	playerId = newPlayerId;
	localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
}

/**
 * Get the current player ID
 */
export function getPlayerId(): string {
	return playerId;
}
