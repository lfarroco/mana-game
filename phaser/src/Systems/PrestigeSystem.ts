import { getState } from "@Models/State";
import * as UIManager from "@UI/UI";


export function processVictory(): void {
	const playerState = getState().gameData.player;
	const prestigeGain = Math.max(Math.floor(playerState.round / 2), 1);

	playerState.prestige += prestigeGain;
	playerState.wins += 1;
	UIManager.events.onPrestigeChanged(playerState.prestige, prestigeGain);
	UIManager.events.onWinsChanged(playerState.wins, 1);
}

export function processDefeat(): void {
	const playerState = getState().gameData.player;
	const oldPrestige = playerState.prestige;
	const newPrestige = Math.max(0, playerState.prestige - playerState.round);
	const prestigeDelta = newPrestige - oldPrestige;

	playerState.prestige = newPrestige;

	UIManager.events.onPrestigeChanged(playerState.prestige, prestigeDelta);
}

export function finalizeRound(): void {
	const state = getState();
	state.gameData.player.round += 1;
	UIManager.events.onRoundChanged(state.gameData.player.round, 1);
}