import { GameController, GameFeature } from "@Core/GameController";
import { sendOptionSelection, sendTeamUpdate } from "@Multiplayer/MultiplayerManager";
import { getState } from "@Models/State";
import { handlePhaseEnded } from "@Scenes/Battleground/PhaseManager";
import * as ShopPanel from "@Systems/Shop/ShopPanel";

/**
 * Creates a remote game controller that handles actions through the multiplayer manager.
 * Used for multiplayer mode.
 *
 * @returns A GameController instance for multiplayer gameplay
 */
export const createRemoteGameController = (): GameController => {
	return {
		purchaseUnit: async (cardId: string, _targetSlot?: number): Promise<boolean> => {
			const success = await sendOptionSelection(cardId);

			if (success) {
				await ShopPanel.slideOut();
				handlePhaseEnded(getState());
			}

			return success;
		},

		sellUnit: async (unitId: string): Promise<boolean> => {
			return await sendOptionSelection("discard_unit", { unitId });
		},

		skipPhase: async (): Promise<boolean> => {
			const state = getState();

			// Determine the appropriate skip action based on current phase
			let actionId = "skip";
			if (state.session.phase === "shop") {
				actionId = "skip_shop";
			} else if (state.session.phase === "orb_shop") {
				actionId = "orb_shop_done";
			} else if (state.session.phase === "upgrade_core") {
				actionId = "upgrade_core_done";
			} else if (state.session.phase === "add_reaction_core") {
				actionId = "add_reaction_core_done";
			}

			const success = await sendOptionSelection(actionId);

			if (success) {
				handlePhaseEnded(getState());
			}

			return success;
		},

		selectEncounter: async (encounterId: string): Promise<boolean> => {
			const success = await sendOptionSelection(encounterId);

			if (success) {
				handlePhaseEnded(getState());
			}

			return success;
		},

		handleAction: async (actionId: string, payload?: any): Promise<boolean> => {
			const success = await sendOptionSelection(actionId, payload);

			if (success) {
				handlePhaseEnded(getState());
			}

			return success;
		},

		updateTeam: async (team: { units: any[] }): Promise<boolean> => {
			return await sendTeamUpdate(team);
		},

		notifyGameComplete: async (actionId: string): Promise<boolean> => {
			// In multiplayer, notify the server about game completion.
			// Expected actionId values: 'combat_done' (signals game end/new run request)
			return await sendOptionSelection(actionId);
		},

		isFeatureEnabled: (feature: GameFeature): boolean => {
			// In multiplayer mode, certain features are disabled
			switch (feature) {
				case "new_run_button":
					// In multiplayer, starting a new run from in-game menu is disabled
					return false;
				case "infinite_mode":
					// Infinite mode is not available in multiplayer
					return false;
				case "skip_encounter":
					// Skipping encounters is not allowed in multiplayer
					return false;
				case "seed_selection":
					// Seed selection is not available in multiplayer
					return false;
				default:
					return false;
			}
		},
	};
};
