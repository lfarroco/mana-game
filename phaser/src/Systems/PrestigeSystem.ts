import { getState } from "@Models/State";
import * as UIManager from "@UI/UI";

export function processVictory(): void {
	const state = getState();
	const playerState = state.gameData.player;
	// Use the top-level gameData.round as the single source of truth for the current round.
	const prestigeGain = Math.max(Math.floor(state.gameData.round / 2), 1);

	playerState.prestige += prestigeGain;
	UIManager.events.onPrestigeChanged(playerState.prestige, prestigeGain);

	playerState.wins += 1;
	UIManager.events.onWinsChanged(playerState.wins, 1);
}

export function processDefeat(): void {
	const state = getState();

	const playerState = state.gameData.player;
	const oldPrestige = playerState.prestige;
	const newPrestige = Math.max(0, playerState.prestige - state.gameData.round);
	const prestigeDelta = newPrestige - oldPrestige;

	playerState.prestige = newPrestige;

	UIManager.events.onPrestigeChanged(playerState.prestige, prestigeDelta);
}

export function finalizeRound(): void {
	const state = getState();
	// Move to a single source of truth: increment the top-level round only.
	state.gameData.round += 1;
	UIManager.events.onRoundChanged(state.gameData.round);
}
