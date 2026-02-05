import { GameController } from "./GameController";
import { MultiplayerManager } from "@Multiplayer/MultiplayerManager";
import { getState } from "@Models/State";
import { handlePhaseEnded } from "@Scenes/Battleground/PhaseManager";

/**
 * Creates a remote game controller that handles actions through the multiplayer manager.
 * Used for multiplayer mode.
 * 
 * @returns A GameController instance for multiplayer gameplay
 */
export const createRemoteGameController = (): GameController => {
	return {
		purchaseUnit: async (cardId: string, _targetSlot?: number): Promise<boolean> => {
			const success = await MultiplayerManager.getInstance().sendOptionSelection(cardId);
			
			if (success) {
				handlePhaseEnded(getState());
			}
			
			return success;
		},

		sellUnit: async (unitId: string): Promise<boolean> => {
			return await MultiplayerManager.getInstance().sendOptionSelection('discard_unit', { unitId });
		},

		skipPhase: async (): Promise<boolean> => {
			const state = getState();
			
			// Determine the appropriate skip action based on current phase
			let actionId = 'skip';
			if (state.session.phase === 'shop') {
				actionId = 'shop_done';
			} else if (state.session.phase === 'orb_shop') {
				actionId = 'orb_shop_done';
			} else if (state.session.phase === 'upgrade_core') {
				actionId = 'upgrade_core_done';
			} else if (state.session.phase === 'add_reaction_core') {
				actionId = 'add_reaction_core_done';
			}
			
			const success = await MultiplayerManager.getInstance().sendOptionSelection(actionId);
			
			if (success) {
				handlePhaseEnded(getState());
			}
			
			return success;
		},

		selectEncounter: async (encounterId: string): Promise<boolean> => {
			const success = await MultiplayerManager.getInstance().sendOptionSelection(encounterId);
			
			if (success) {
				handlePhaseEnded(getState());
			}
			
			return success;
		},

		handleAction: async (actionId: string, payload?: any): Promise<boolean> => {
			const success = await MultiplayerManager.getInstance().sendOptionSelection(actionId, payload);
			
			if (success) {
				handlePhaseEnded(getState());
			}
			
			return success;
		},

		updateTeam: async (team: { units: any[] }): Promise<boolean> => {
			return await MultiplayerManager.getInstance().sendTeamUpdate(team);
		}
	};
};
