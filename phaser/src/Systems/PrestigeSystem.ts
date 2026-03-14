import { getState } from "@Models/State";
import * as UIManager from "@UI/UI";

export function processVictory(): void {
	const state = getState();
	// wins already incremented server-side during combat simulation; just update the UI
	UIManager.events.onWinsChanged(state.session.wins, 1);
}

export function processDefeat(): void {
	const state = getState();
	// losses already incremented server-side during combat simulation; just update the UI
	const lives = 4 - state.session.losses;
	UIManager.events.onLivesChanged(lives, -1);
}

export function finalizeRound(): void {
	const state = getState();
	state.session.round += 1;
	UIManager.events.onRoundChanged(state.session.round);
}
