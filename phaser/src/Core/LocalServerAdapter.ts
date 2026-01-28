import { IGameServer } from './IGameServer';
import { SessionManager } from './SessionManager';
import { GameLogic } from './GameLogic';
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
		};

		switch (session.phase) {
			case 'encounter':
				const encOpts = GameLogic.generateEncounterOptions(session);
				response.options = encOpts.options;
				break;

			case 'shop':
				const shopOpts = GameLogic.generateShopOptions(session);
				response.options = shopOpts.options;
				break;

			case 'combat':
				// Combat state should already be in session.current_options from transitionToNextState
				if (session.current_options && (session.current_options as any).combatState) {
					response.combatState = (session.current_options as any).combatState;
				} else {
					// Fallback: simulate combat if not already done
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
				} break;
			case 'orb_shop':
			case 'upgrade_core':
			case 'add_reaction_core':
				// TODO: Implement these phases
				// For now, return empty options
				break;

			default:
				// For other phases
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

			// Update the session in the manager
			this.sessionManager.updateSession(playerId, result.session);

			return true;
		} catch (error) {
			console.error(`Error handling action ${actionId} for player ${playerId}:`, error);
			return false;
		}
	}
}
