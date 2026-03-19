import { IGameServer } from "@Core/IGameServer";
import { SessionData, PhaseOptions, PhaseType, ActionPayload, CombatState } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import { CombatLogEntry } from "@Scenes/Battleground/ServerCombatEffects";
import { supabase } from "@lib/supabase";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("RemoteServerAdapter");

/**
 * Remote implementation of the game server using Supabase.
 * Used for multiplayer mode - communicates with Supabase Edge Functions.
 */
export class RemoteServerAdapter implements IGameServer {
	private playerId: string;

	constructor(playerId?: string) {
		const storedId = localStorage.getItem("mana_player_id");
		this.playerId = playerId || storedId || `player_${Math.floor(Math.random() * 1000000)}`;
		if (!storedId) {
			localStorage.setItem("mana_player_id", this.playerId);
		}
	}

	async createSession(_playerId: string, crystalId: string): Promise<SessionData> {
		const { data, error } = await supabase.functions.invoke("action", {
			body: {
				actionId: "start_session",
				payload: { selectedCrystalId: crystalId },
			},
		});

		if (error) {
			throw new Error(`Failed to create session: ${error.message}`);
		}

		return data as SessionData;
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
		localStorage.setItem("mana_player_id", playerId);
	}

	/**
	 * Get the current player ID
	 */
	getPlayerId(): string {
		return this.playerId;
	}
}
