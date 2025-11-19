import { getState } from "@Models/State";
import * as UIManager from "@UI/UI";

export function processVictory(): void {
	const state = getState();
	const playerState = state.gameData.player;

	playerState.wins += 1;
	UIManager.events.onWinsChanged(playerState.wins, 1);
}

export function processDefeat(): void {
	const state = getState();

	const playerState = state.gameData.player;
	const oldLives = playerState.lives;
	const newLives = Math.max(0, playerState.lives - 1);
	const livesDelta = newLives - oldLives;

	playerState.lives = newLives;

	UIManager.events.onLivesChanged(playerState.lives, livesDelta);
}

export function finalizeRound(): void {
	const state = getState();
	// Move to a single source of truth: increment the top-level round only.
	state.gameData.round += 1;
	UIManager.events.onRoundChanged(state.gameData.round);
}
