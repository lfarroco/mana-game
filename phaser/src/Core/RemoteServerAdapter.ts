import { IGameServer } from "@Core/IGameServer";
import { SessionData, PhaseOptions, PhaseType, ActionPayload, CombatState, SessionType } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import { CombatLogEntry } from "@Core/Combat/ServerCombatEffects";
import { supabase } from "@lib/supabase";
import { primeDeferredSession, getMultiplayerSessionType } from "@Multiplayer/MultiplayerManager";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("RemoteServerAdapter");

const PLAYER_ID_STORAGE_KEY = "mana_player_id";
const PLAYER_ID_PREFIX = "player_";
const PLAYER_ID_RANDOM_MAX = 1_000_000;

/**
 * Remote implementation of the game server using Supabase.
 * Used for multiplayer mode - communicates with Supabase Edge Functions.
 */
export class RemoteServerAdapter implements IGameServer {
	private playerId: string;

	constructor(playerId?: string) {
		const storedId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
		this.playerId =
			playerId ||
			storedId ||
			`${PLAYER_ID_PREFIX}${Math.floor(Math.random() * PLAYER_ID_RANDOM_MAX)}`;
		if (!storedId) {
			localStorage.setItem(PLAYER_ID_STORAGE_KEY, this.playerId);
		}
	}

	async createSession(_playerId: string, crystalId: string): Promise<SessionData> {
		const sessionType = getMultiplayerSessionType() as SessionType;
		const { data, error } = await supabase.functions.invoke("action", {
			body: {
				actionId: "start_session",
				payload: { selectedCrystalId: crystalId, sessionType },
			},
		});

		if (error) {
			throw new Error(`Failed to create session: ${error.message}`);
		}

		const session = { ...(data as SessionData), session_type: sessionType };
		primeDeferredSession(session, crystalId);

		return session;
	}

	async getSession(playerId: string): Promise<SessionData | null> {
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

	async getPhaseOptions(playerId: string): Promise<PhaseOptions> {
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

	async handleAction(
		_playerId: string,
		actionId: string,
		payload?: ActionPayload
	): Promise<boolean> {
		const { error } = await supabase.functions.invoke("action", {
			body: { actionId, payload },
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
	setPlayerId(playerId: string): void {
		this.playerId = playerId;
		localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
	}

	/**
	 * Get the current player ID
	 */
	getPlayerId(): string {
		return this.playerId;
	}
}
