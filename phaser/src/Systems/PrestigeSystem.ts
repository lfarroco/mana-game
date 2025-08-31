import { getState } from "@Models/State";
import * as UIManager from "@UI/UI";


export function processVictory(): void {
	const playerState = getState().gameData.player;
	const prestigeGain = Math.max(Math.floor(playerState.round / 2), 1);

	playerState.prestige += prestigeGain;
	playerState.wins += 1;
	UIManager.updatePrestigeDisplay(playerState.prestige);
	UIManager.events.onWinsChanged(playerState.wins, 1);
}

export function processDefeat(): void {
	const playerState = getState().gameData.player;
	const newPrestige = Math.max(0, playerState.prestige - playerState.round);

	playerState.prestige = newPrestige;

	UIManager.updatePrestigeDisplay(playerState.prestige);
}

export function finalizeRound(): void {
	getState().gameData.player.round += 1;
}