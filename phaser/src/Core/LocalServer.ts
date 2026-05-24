import { GameServer } from "@Core/GameServer";
import { SessionManager } from "@Core/SessionManager";
import * as GameLogic from "@Core/GameLogic";
import {
	SessionData,
	PhaseOptions,
	PhaseType,
	PhaseOption,
	CombatState,
	ActionPayload,
} from "@Core/Types";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("LocalServerAdapter");

const cloneValue = <T>(value: T): T => {
	if (typeof globalThis.structuredClone === "function") {
		return globalThis.structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as T;
};

/**
 * Local in-memory implementation of the game server.
 * Used for single-player mode - runs all game logic locally without network calls.
 */
export class LocalServer implements GameServer {
	// Made public to allow debugging/testing scenarios to set up arbitrary session states
	// See: DebugController.startBattlegroundWithSession()
	sessionManager = new SessionManager();

	private getFallbackOptionsForPhase(phase: PhaseType): PhaseOption[] {
		switch (phase) {
			case "upgrade_core":
				return [
					{ id: "increase_core_max_life" },
					{ id: "upgrade_core_power" },
					{ id: "decrease_core_cooldown" },
				];
			case "add_reaction_core":
				return [
					{ id: "on_100_damage_effect" },
					{ id: "on_crit_effect" },
					{ id: "on_battle_start_effect" },
				];
			default:
				return [];
		}
	}

	private getCurrentOptions(session: SessionData): PhaseOption[] {
		if (!session.current_options) {
			return [];
		}

		if (Array.isArray(session.current_options)) {
			return session.current_options;
		}

		return session.current_options.options || [];
	}

	private getCurrentCombatState(session: SessionData): CombatState | null {
		if (!session.current_options || Array.isArray(session.current_options)) {
			return null;
		}

		return session.current_options.combatState || null;
	}

	async createSession(playerId: string, crystalId: string): Promise<SessionData> {
		const session = GameLogic.createInitialSession(playerId, crystalId);
		session.id = `local-${playerId}-${Date.now()}`;
		this.sessionManager.updateSession(playerId, session);
		return session;
	}

	async getSession(playerId: string): Promise<SessionData | null> {
		return this.sessionManager.getSession(playerId);
	}

	async getPhaseOptions(playerId: string): Promise<PhaseOptions> {
		const session = this.sessionManager.getSession(playerId);
		if (!session) {
			throw new Error(`No session found for player ${playerId}`);
		}

		const response: PhaseOptions = {
			phase: session.phase as PhaseType,
			round: session.round,
			options: [],
			team: cloneValue(session.team),
			wins: session.wins,
			losses: session.losses,
			runStats: session.runStats,
		};

		switch (session.phase) {
			case "encounter":
				if (session.current_options) {
					response.options = this.getCurrentOptions(session);
				} else {
					const encOpts = GameLogic.generateEncounterOptions(session);
					response.options = encOpts.options;
					session.current_options = { options: encOpts.options };
					this.sessionManager.updateSession(playerId, session);
				}
				break;

			case "shop":
				if (session.current_options) {
					response.options = this.getCurrentOptions(session);
				} else {
					const shopOpts = GameLogic.generateShopOptions(session);
					response.options = shopOpts.options;
					session.current_options = { options: shopOpts.options };
					this.sessionManager.updateSession(playerId, session);
				}
				break;

			case "combat":
				// Combat state should already be in session.current_options from transitionToNextState
				{
					const combatState = this.getCurrentCombatState(session);
					if (!combatState) {
						break;
					}
					response.combatState = cloneValue({
						...combatState,
						units: combatState.initialUnits || combatState.units || [],
						initialUnits: combatState.initialUnits || combatState.units || [],
					});
					response.options = [{ id: "combat_done", label: "Continue" }];
				}
				break;

			case "orb_shop":
			case "upgrade_core":
			case "add_reaction_core":
				if (session.current_options) {
					response.options = this.getCurrentOptions(session);
				}

				if (response.options.length === 0) {
					const fallbackOptions = this.getFallbackOptionsForPhase(session.phase as PhaseType);
					if (fallbackOptions.length > 0) {
						response.options = fallbackOptions;
						session.current_options = { options: fallbackOptions };
						this.sessionManager.updateSession(playerId, session);
					}
				}
				break;
		}

		return response;
	}

	async handleAction(
		playerId: string,
		actionId: string,
		payload?: ActionPayload
	): Promise<boolean> {
		const session = this.sessionManager.getSession(playerId);
		if (!session) {
			logger.error("Session not found", { playerId });
			return false;
		}

		try {
			// Handle the action and transition to next state
			const result = GameLogic.transitionToNextState(session, actionId, payload);

			// Update the session in the manager (this saves to localStorage with SessionManager's format)
			this.sessionManager.updateSession(playerId, result.session);

			return true;
		} catch (error) {
			logger.error("Failed to handle action", { playerId, actionId, error });
			return false;
		}
	}
}
