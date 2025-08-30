import { getState } from "@Models/State";
import * as Systems from "@Scenes/Battleground/Systems";
import * as UIManager from "@UI/UI";


export function processVictory(): void {
	const playerState = getState().gameData.player;
	const prestigeGain = 1;
	playerState.prestige += prestigeGain;

	UIManager.updatePrestige(playerState.prestige);

	if (playerState.prestige >= 30) {
		Systems.Progression.handlePlayerWonGame();
	}
}

export function processDefeat(): void {
	const playerState = getState().gameData.player;
	const prestigeLoss = 1;

	playerState.prestige -= prestigeLoss;
	playerState.prestige = Math.max(0, playerState.prestige);

	UIManager.updatePrestige(playerState.prestige);
}

export function finalizeRound(): void {
	getState().gameData.player.totalRoundsPlayed += 1;
}