import { getState } from "../Models/State";
import { scene } from "../Scenes/Battleground/BattlegroundScene";
import * as UIManager from "../UI/UIManager";

export class PrestigeSystem {

	processVictory(): void {
		const playerState = getState().gameData.player;
		const prestigeGain = 1;
		playerState.prestige += prestigeGain;
		playerState.winStreak += 1;
		playerState.lossStreak = 0;

		UIManager.updatePrestige(playerState.prestige, prestigeGain);

		if (playerState.prestige >= 30) {
			scene.battleProgressionSystem.handlePlayerWonGame();
		}
	}

	processDefeat(): void {
		const playerState = getState().gameData.player;
		const oldPrestige = playerState.prestige;
		const prestigeLoss = 1;

		playerState.prestige -= prestigeLoss;
		playerState.prestige = Math.max(0, playerState.prestige);

		playerState.lossStreak += 1;
		playerState.winStreak = 0;

		const actualPrestigeChange = playerState.prestige - oldPrestige;
		UIManager.updatePrestige(playerState.prestige, actualPrestigeChange);
	}

	finalizeRound(): void {
		getState().gameData.player.totalRoundsPlayed += 1;
	}
}