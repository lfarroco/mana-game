import { getState } from "@Models/State";
import * as UIManager from "@UI/UI";

export function processVictory(): void {
	const state = getState();
	// const playerState = state.gameData.player;

	state.session.wins += 1;
	UIManager.events.onWinsChanged(state.session.wins, 1);
}

export function processDefeat(): void {
	const state = getState();

	const oldLives = 4 - state.session.losses;

	state.session.losses = Math.min(4, state.session.losses + 1);

	const newLives = 4 - state.session.losses;
	const livesDelta = newLives - oldLives;

	UIManager.events.onLivesChanged(newLives, livesDelta);
}

export function finalizeRound(): void {
	const state = getState();
	state.session.round += 1;
	UIManager.events.onRoundChanged(state.session.round);
}
