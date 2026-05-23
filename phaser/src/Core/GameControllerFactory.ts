import { GameController } from "@Core/GameController";
import { createLocalGameController } from "@Core/LocalGameController";
import { createRemoteGameController } from "@Core/RemoteGameController";

/**
 * Global controller instance.
 * This is initialized when the game starts and updated when switching between modes.
 */
let gameController: GameController | null = null;

/**
 * Creates and returns the appropriate GameController based on the current game mode.
 *
 * @param playerId - The player's ID (required for local mode)
 * @returns A GameController instance
 */
export const createGameController = (
	playerId: string,
	isMultiplayer: boolean = false,
): GameController => {

	if (isMultiplayer)
		return createRemoteGameController();
	else
		return createLocalGameController(playerId);
};

/**
 * Gets the current GameController instance.
 * If no controller exists, creates a local controller with default player ID.
 *
 * @returns The current GameController instance
 */
export const getGameController = (): GameController => {
	if (!gameController) {
		// Create a default local controller
		gameController = createLocalGameController("local_player");
	}

	return gameController;
};
