import { SessionData, PhaseOptions, PhaseType, ActionPayload, CombatState } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import { CombatLogEntry } from "@Core/Combat/ServerCombatEffects";
import { supabase } from "@lib/supabase";
import { primeDeferredSession } from "@Multiplayer/MultiplayerManager";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("RemoteServer");

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




export async function createSession(_playerId: string, crystalId: string): Promise<SessionData> {
	const sessionType = state.session.session_type;
	const seed = generateSessionSeed();
	const { data, error } = await supabase.functions.invoke("action", {
		body: {
			actionId: "start_session",
			payload: { selectedCrystalId: crystalId, sessionType, seed },
		},
	});

	if (error) {
		throw new Error(`Failed to create session: ${error.message}`);
	}

	const session = { ...(data as SessionData), session_type: sessionType };
	primeDeferredSession(session, crystalId);

	return session;
}

export async function getSession(playerId: string): Promise<SessionData | null> {
	const { data, error } = await supabase
		.from("player_sessions")
		.select("*")
		.eq("player_id", playerId)
		.maybeSingle();

	if (error) {
		logger.error("Failed to fetch session:", error);
		return null;
	}

	return data as SessionData | null;
}

export async function getPhaseOptions(playerId: string): Promise<PhaseOptions> {
	const { data: session, error } = await supabase
		.from("player_sessions")
		.select("*")
		.eq("player_id", playerId)
		.single();

	if (error || !session) {
		throw new Error(`Failed to fetch phase options: ${error?.message || "No session found"}`);
	}

	let combatState: CombatState | undefined = undefined;
	if (session.phase === "combat") {
		const optionsCombatState = (session.current_options as Record<string, unknown>)
			?.combatState as Record<string, unknown> | undefined;
		if (optionsCombatState && Array.isArray(optionsCombatState.logs)) {
			logger.debug("Using server-provided combat logs");
			const enemyTeam = Array.isArray(optionsCombatState.enemyTeam)
				? (optionsCombatState.enemyTeam as Unit[])
				: [];
			const units = Array.isArray(optionsCombatState.initialUnits)
				? (optionsCombatState.initialUnits as Unit[])
				: [];
			const finalPlayerUnits = Array.isArray(optionsCombatState.finalPlayerUnits)
				? (optionsCombatState.finalPlayerUnits as Unit[])
				: undefined;
			const wonCombat =
				typeof optionsCombatState.wonCombat === "boolean"
					? optionsCombatState.wonCombat
					: undefined;
			combatState = {
				units,
				enemyTeam,
				logs: optionsCombatState.logs as CombatLogEntry[],
				seed: session.seed,
				enemyPlayerName:
					typeof optionsCombatState.enemyPlayerName === "string"
						? optionsCombatState.enemyPlayerName
						: undefined,
				wonCombat,
				finalPlayerUnits,
				initialUnits: units,
			};
		}
	}

	const optionsList = session.current_options?.options || [];

	return {
		phase: session.phase as PhaseType,
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
	actionId: string,
	payload?: ActionPayload
): Promise<boolean> {
	const bodyPayload =
		actionId === "combat_encounter" && (!payload || typeof payload === "object")
			? {
				...(payload || {}),
				sessionType: state.session.session_type,
			}
			: payload;

	const { error } = await supabase.functions.invoke("action", {
		body: { actionId, payload: bodyPayload },
	});

	if (error) {
		logger.error(`Failed to handle action ${actionId}:`, error);
		return false;
	}

	return true;
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
