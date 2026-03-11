import { IGameServer } from './IGameServer';
import { SessionManager } from './SessionManager';
import * as GameLogic from './GameLogic';
import { SessionData, PhaseOptions, PhaseType } from './Types';

/**
 * Local in-memory implementation of the game server.
 * Used for single-player mode - runs all game logic locally without network calls.
 */
export class LocalServerAdapter implements IGameServer {
	private sessionManager = new SessionManager();

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
			team: session.team,
			wins: session.wins,
			losses: session.losses,
			runStats: session.runStats
		};

		switch (session.phase) {
			case 'encounter':
				// Use stored options if available (consistent with shop behavior)
				if (session.current_options) {
					response.options = Array.isArray(session.current_options)
						? session.current_options
						: (session.current_options as any).options || session.current_options;
				} else {
					// Fallback: generate encounter options if not stored
					const encOpts = GameLogic.generateEncounterOptions(session);
					response.options = encOpts.options;
				}
				break;

			case 'shop':
				// Use stored options if available (important after discard_unit actions)
				if (session.current_options) {
					response.options = Array.isArray(session.current_options)
						? session.current_options
						: (session.current_options as any).options || session.current_options;
				} else {
					// Fallback: generate shop options if not stored
					const shopOpts = GameLogic.generateShopOptions(session);
					response.options = shopOpts.options;
				}
				break;

			case 'combat':
				// Combat state should already be in session.current_options from transitionToNextState
				if (session.current_options && (session.current_options as any).combatState) {
					const combatState = (session.current_options as any).combatState;
					// Normalize combatState structure
					response.combatState = {
						...combatState,
						units: combatState.units || combatState.initialUnits,
						initialUnits: combatState.initialUnits
					};
					const enemyTeam = GameLogic.generateEnemyTeamForRound(session.round, session.wins);
					const simResult = GameLogic.simulateCombat(session);
					const playerUnits = simResult.finalState.battleData.units.filter((u: any) => u.force === 'PLAYER');

					response.combatState = {
						units: simResult.initialUnits,
						logs: simResult.logs,
						enemyTeam: enemyTeam,
						seed: session.seed,
						initialUnits: simResult.initialUnits,
						finalPlayerUnits: playerUnits,
					};
					response.options = [{ id: 'combat_done', label: 'Continue' }];
				}
				break;

			case 'orb_shop':
			case 'upgrade_core':
			case 'add_reaction_core':
				// Return options from session
				if (session.current_options) {
					response.options = Array.isArray(session.current_options)
						? session.current_options
						: (session.current_options as any).options || session.current_options;
				}
				break;
		}

		return response;
	}

	async handleAction(playerId: string, actionId: string, payload?: any): Promise<boolean> {
		const session = this.sessionManager.getSession(playerId);
		if (!session) {
			console.error(`No session found for player ${playerId}`);
			return false;
		}

		try {
			// Handle the action and transition to next state
			const result = GameLogic.transitionToNextState(session, actionId, payload);

			// Update the session in the manager (this saves to localStorage with SessionManager's format)
			this.sessionManager.updateSession(playerId, result.session);

			return true;
		} catch (error) {
			console.error(`Error handling action ${actionId} for player ${playerId}:`, error);
			return false;
		}
	}
}
