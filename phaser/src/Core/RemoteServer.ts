import * as Models from "@Core/Models";
import * as Unit from "@Models/Entities/Unit";
import * as CombatLogger from "@Core/Combat/CombatLogger";
import * as CombatConstants from "@Core/Combat/CombatConstants";
import * as supabase from "@lib/supabase";
import * as Logger from "@Utils/Logger";
import * as CombatSimulation from "./Combat/CombatSimulation";


const PLAYER_ID_STORAGE_KEY = "mana_player_id";
const PLAYER_ID_PREFIX = "player_";
const PLAYER_ID_RANDOM_MAX = 1_000_000;

// TODO: this is bad
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
	const sessionType = state.session.session_type;
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
		Logger.error("RemoteServer", "Failed to fetch session:", error);
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
	const sessionCombatState = getSessionCombatState(session);

	let combatState: Models.CombatState | undefined = undefined;
	if (session.phase === "combat") {
		if (sessionCombatState && Array.isArray(sessionCombatState.logs)) {
			Logger.debug("RemoteServer", "Using server-provided combat logs");
			const enemyTeam = Array.isArray(sessionCombatState.enemyTeam)
				? (sessionCombatState.enemyTeam as Unit.Unit[])
				: [];
			const units = Array.isArray(sessionCombatState.initialUnits)
				? (sessionCombatState.initialUnits as Unit.Unit[])
				: [];
			const finalPlayerUnits = Array.isArray(sessionCombatState.finalPlayerUnits)
				? (sessionCombatState.finalPlayerUnits as Unit.Unit[])
				: [];
			const wonCombat =
				typeof sessionCombatState.wonCombat === "boolean"
					? sessionCombatState.wonCombat
					: false;
			combatState = {
				units,
				enemyTeam,
				logs: sessionCombatState.logs as CombatLogger.CombatLogEntry[],
				seed: session.seed,
				enemyPlayerName:
					typeof sessionCombatState.enemyPlayerName === "string"
						? sessionCombatState.enemyPlayerName
						: "",
				wonCombat,
				finalPlayerUnits,
				initialUnits: units,

			};
		} else {
			Logger.warn("RemoteServer", "Combat logs missing from session; simulating locally");
			const simResult = CombatSimulation.simulateCombat(session as unknown as Models.SessionData);
			combatState = {
				...session.combatState, // TODO: probably wrong
				units: simResult.initialUnits,
				enemyTeam: simResult.initialUnits.filter((u: Unit.Unit) => u.force === CombatConstants.FORCE_ID_CPU),
				logs: simResult.logs,
				seed: session.seed,
			};
		}
	}
	state.session.combatState = combatState ?? undefined;

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
): Promise<Models.SessionData> {
	const bodyPayload =
		action.type === "start_combat"
			? {
				...(action || {}),
				sessionType: state.session.session_type,
			}
			: action;

	const response = await supabase.supabase.functions.invoke("action", {
		body: { action: bodyPayload },
	});

	if (response.error) {
		Logger.error("RemoteServer", `Failed to handle action ${action.type}:`, response.error);
		throw new Error(`Failed to handle action ${action.type}: ${response.error.message}`);
	}

	const nextSession = response.data as Models.SessionData;
	nextSession.combatState = getSessionCombatState(response.data);
	state.session = nextSession;
	return nextSession;
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
