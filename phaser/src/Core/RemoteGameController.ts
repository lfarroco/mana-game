import { GameController, GameFeature } from "@Core/GameController";
import { ActionPayload } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import {
	finalizeCompletedRun,
	sendOptionSelection,
	sendTeamUpdate,
} from "@Multiplayer/MultiplayerManager";
import { startPhase } from "Client/Screens/Battleground/PhaseManager";

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
				startPhase(state);
			}

			return success;
		},

		sellUnit: async (unitId: string): Promise<boolean> => {
			return await sendOptionSelection("discard_unit", { unitId });
		},

		skipPhase: async (): Promise<boolean> => {

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
				startPhase(state);
			}

			return success;
		},

		selectEncounter: async (encounterId: string): Promise<boolean> => {
			const success = await sendOptionSelection(encounterId);

			if (success) {
				startPhase(state);
			}

			return success;
		},

		handleAction: async (actionId: string, payload?: ActionPayload): Promise<boolean> => {
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

			const success = await sendOptionSelection(actionId, payload);

			if (success && !isInPhaseUpgradeSelection) {
				startPhase(state);
			}

			return success;
		},

		updateTeam: async (team: { units: Unit[] }): Promise<boolean> => {
			return await sendTeamUpdate(team);
		},

		notifyGameComplete: async (actionId: string): Promise<boolean> => {

			// Deferred multiplayer runs are already terminal by the time the game-complete UI
			// is shown, so there is nothing left to notify. Sending another transition action
			// from a terminal phase can produce invalid local transitions.
			if (state.session.phase === "victory" || state.session.phase === "game_over") {
				return await finalizeCompletedRun();
			}

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
