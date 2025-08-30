import { getState } from "@Models/State";
import * as UIManager from "@UI/UI";


export function processVictory(): void {
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