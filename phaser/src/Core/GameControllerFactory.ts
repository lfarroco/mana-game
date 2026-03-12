import { GameController } from "@Core/GameController";
import { createLocalGameController } from "@Core/LocalGameController";
import { createRemoteGameController } from "@Core/RemoteGameController";
import { isMultiplayer } from "@Multiplayer/MultiplayerManager";

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
export const createGameController = (playerId: string): GameController => {
	if (isMultiplayer) {
		gameController = createRemoteGameController();
	} else {
		gameController = createLocalGameController(playerId);
	}

	return gameController;
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

/**
 * Sets the GameController instance directly.
 * Useful for testing or when you have a pre-configured controller.
 *
 * @param controller - The GameController instance to set
 */
export const setGameController = (controller: GameController): void => {
	gameController = controller;
};

/**
 * Resets the GameController instance.
 * The next call to getGameController will create a new instance.
 */
export const resetGameController = (): void => {
	gameController = null;
};
