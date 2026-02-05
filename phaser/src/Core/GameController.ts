import { State } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";

/**
 * GameController type - Unified interface for game actions.
 * Hides the implementation detail of whether the game is local or multiplayer.
 * 
 * This pattern eliminates the need for `isMultiplayer` checks scattered throughout
 * the UI and event handling code.
 */
export type GameController = {
	/**
	 * Purchase a unit from the shop.
	 * @param cardId - The ID of the card to purchase
	 * @param targetSlot - Optional target slot for the unit
	 * @returns Promise that resolves when the action completes
	 */
	purchaseUnit(cardId: string, targetSlot?: number): Promise<boolean>;

	/**
	 * Sell a unit from the player's team.
	 * @param unitId - The ID of the unit to sell
	 * @returns Promise that resolves when the action completes
	 */
	sellUnit(unitId: string): Promise<boolean>;

	/**
	 * Skip or end the current phase.
	 * @returns Promise that resolves when the action completes
	 */
	skipPhase(): Promise<boolean>;

	/**
	 * Select an encounter option.
	 * @param encounterId - The ID of the encounter to select
	 * @returns Promise that resolves when the action completes
	 */
	selectEncounter(encounterId: string): Promise<boolean>;

	/**
	 * Handle a generic action with optional payload.
	 * @param actionId - The action identifier
	 * @param payload - Optional payload for the action
	 * @returns Promise that resolves when the action completes
	 */
	handleAction(actionId: string, payload?: any): Promise<boolean>;

	/**
	 * Update the team composition (for drag-and-drop repositioning).
	 * @param team - The updated team structure
	 * @returns Promise that resolves when the action completes
	 */
	updateTeam(team: { units: Unit[] }): Promise<boolean>;

	/**
	 * Notify game completion (used for new run, main menu, etc.).
	 * @param actionId - The completion action ('combat_done', 'new_run', etc.)
	 * @returns Promise that resolves when the action completes
	 */
	notifyGameComplete(actionId: string): Promise<boolean>;

	/**
	 * Check if a feature is enabled in the current game mode.
	 * This abstracts mode-dependent UI feature availability.
	 * @param feature - The feature to check ('new_run_button', 'infinite_mode', 'skip_encounter', etc.)
	 * @returns Whether the feature is enabled
	 */
	isFeatureEnabled(feature: GameFeature): boolean;
};

/**
 * Features that can be enabled/disabled based on game mode.
 */
export type GameFeature = 
	| 'new_run_button'      // Allow starting a new run from menu
	| 'infinite_mode'       // Allow entering infinite mode after victory
	| 'skip_encounter'      // Allow skipping encounters
	| 'seed_selection';     // Allow selecting custom seeds

/**
 * Context object for controller dependencies.
 */
export type GameControllerContext = {
	state: State;
	playerId: string;
};
