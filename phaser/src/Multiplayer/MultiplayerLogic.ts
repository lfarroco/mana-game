import * as GameLogic from '../Core/GameLogic';

// MultiplayerLogic provides a class interface for the GameLogic functions
// for backward compatibility with Supabase functions
export class MultiplayerLogic {
	static createInitialSession(playerId: string, selectedCrystalId?: string) {
		return GameLogic.createInitialSession(playerId, selectedCrystalId);
	}

	static validateAndApplyTeamUpdate(session: any, newTeam: { units: any[] }) {
		return GameLogic.validateAndApplyTeamUpdate(session, newTeam);
	}

	static resolveAction(session: any, actionId: string, payload?: any) {
		return GameLogic.resolveAction(session, actionId, payload);
	}

	static transitionToNextState(session: any, actionId: string, payload?: any) {
		return GameLogic.transitionToNextState(session, actionId, payload);
	}
}