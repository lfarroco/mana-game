import { State } from "../Models/State";
import { GameEvents } from "../constants/events";
import { BattlegroundScene } from "../Scenes/Battleground/BattlegroundScene";

/**
 * Manages the player's prestige level, updating it based on battle outcomes.
 */
export class PrestigeSystem {
	scene: BattlegroundScene;
	state: State;

	constructor(scene: BattlegroundScene, state: State) {
		this.scene = scene;
		this.state = state;
	}

	/**
	 * Processes the prestige change when the player wins a battle.
	 */
	processVictory(): void {
		const playerState = this.state.gameData.player;
		const prestigeGain = 1;
		playerState.prestige += prestigeGain;
		playerState.winStreak += 1;
		playerState.lossStreak = 0;

		this.scene.events.emit(GameEvents.PRESTIGE_CHANGED, playerState.prestige, prestigeGain);

		if (playerState.prestige >= 30) {
			this.scene.events.emit(GameEvents.PLAYER_WON_GAME);
		}
	}

	/**
	 * Processes the prestige change when the player loses a battle.
	 */
	processDefeat(): void {
		const playerState = this.state.gameData.player;
		const oldPrestige = playerState.prestige;
		const prestigeLoss = 1; // Reduced from 2 to be less punitive

		playerState.prestige -= prestigeLoss;
		playerState.prestige = Math.max(0, playerState.prestige); // Prestige cannot go below 0

		playerState.lossStreak += 1;
		playerState.winStreak = 0;

		const actualPrestigeChange = playerState.prestige - oldPrestige;
		this.scene.events.emit(GameEvents.PRESTIGE_CHANGED, playerState.prestige, actualPrestigeChange);
	}

	/**
	 * Finalizes round-specific statistics like total rounds played.
	 * Should be called after every battle.
	 */
	finalizeRound(): void {
		this.state.gameData.player.totalRoundsPlayed += 1;
		this.scene.events.emit(GameEvents.ROUND_ENDED_UPDATE_STATS, {
			totalRounds: this.state.gameData.player.totalRoundsPlayed,
			currentPrestige: this.state.gameData.player.prestige
		});
	}
}