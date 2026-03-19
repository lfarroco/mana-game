import { GameController, GameFeature } from "@Core/GameController";
import { ActionPayload } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import { getServerAdapter } from "@Core/ServerFactory";
import { getState } from "@Models/State";
import * as PhaseManager from "@Scenes/Battleground/PhaseManager";
import * as ShopPanel from "@Systems/Shop/ShopPanel";

/**
 * Creates a local game controller that handles actions through the local server adapter.
 * Used for single-player mode.
 *
 * @param playerId - The player's ID
 * @returns A GameController instance for local gameplay
 */
export const createLocalGameController = (playerId: string): GameController => {
	return {
		purchaseUnit: async (cardId: string, _targetSlot?: number): Promise<boolean> => {
			const server = getServerAdapter();
			const success = await server.handleAction(playerId, cardId);

			if (success) {
				await ShopPanel.slideOut();
				// Render the next phase
				await PhaseManager.startPhase(getState());
			}

			return success;
		},

		sellUnit: async (unitId: string): Promise<boolean> => {
			const server = getServerAdapter();
			return await server.handleAction(playerId, "discard_unit", { unitId });
		},

		skipPhase: async (): Promise<boolean> => {
			const server = getServerAdapter();
			const state = getState();

			// Determine the appropriate skip action based on current phase
			let actionId = "skip";
			if (state.session.phase === "encounter") {
				actionId = "skip_encounter";
			} else if (state.session.phase === "shop") {
				actionId = "skip_shop";
			} else if (state.session.phase === "orb_shop") {
				actionId = "orb_shop_done";
			} else if (state.session.phase === "upgrade_core") {
				actionId = "upgrade_core_done";
			} else if (state.session.phase === "add_reaction_core") {
				actionId = "add_reaction_core_done";
			}

			const success = await server.handleAction(playerId, actionId);

			if (success) {
				await PhaseManager.startPhase(getState());
			}

			return success;
		},

		selectEncounter: async (encounterId: string): Promise<boolean> => {
			const server = getServerAdapter();
			const success = await server.handleAction(playerId, encounterId);

			if (success) {
				await PhaseManager.startPhase(getState());
			}

			return success;
		},

		handleAction: async (actionId: string, payload?: ActionPayload): Promise<boolean> => {
			const server = getServerAdapter();
			const state = getState();
			const inUpgradePhase = state.session.phase === "upgrade_core";
			const inReactionPhase = state.session.phase === "add_reaction_core";
			const isInPhaseUpgradeSelection =
				(inUpgradePhase &&
					["increase_core_max_life", "upgrade_core_power", "decrease_core_cooldown"].includes(
						actionId
					)) ||
				(inReactionPhase &&
					[
						"on_100_damage_effect",
						"on_ally_death_effect",
						"on_crit_effect",
						"on_battle_start_effect",
					].includes(actionId));

			const success = await server.handleAction(playerId, actionId, payload);

			if (success && !isInPhaseUpgradeSelection) {
				await PhaseManager.startPhase(getState());
			}

			return success;
		},

		updateTeam: async (team: { units: Unit[] }): Promise<boolean> => {
			const server = getServerAdapter();
			return await server.handleAction(playerId, "update_team", { team });
		},

		notifyGameComplete: async (_actionId: string): Promise<boolean> => {
			// In single-player, no server notification is needed for game completion
			// Just return true to allow the UI to proceed
			return true;
		},

		isFeatureEnabled: (_feature: GameFeature): boolean => {
			// In single-player mode, all features are enabled
			return true;
		},
	};
};
