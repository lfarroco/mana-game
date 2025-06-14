import { State } from "../Models/State";
import { GameEvents } from "../constants/events";
import { BattlegroundScene } from "../Scenes/Battleground/BattlegroundScene";

/**
 * Manages the player's prestige level, updating it based on battle outcomes.
 */
export class PrestigeSystem {
	private scene: BattlegroundScene;
	private state: State;

	constructor(scene: BattlegroundScene, state: State) {
		this.scene = scene;
		this.state = state;
	}

	/**
	 * Processes the prestige change when the player wins a battle.
	 */
	public processVictory(): void {
		this.state.gameData.player.prestige += 1;
		this.scene.events.emit(GameEvents.PRESTIGE_CHANGED, this.state.gameData.player.prestige, 1);
	}

	/**
	 * Processes the prestige change when the player loses a battle.
	 */
	public processDefeat(): void {
		this.state.gameData.player.prestige -= 2;
		this.scene.events.emit(GameEvents.PRESTIGE_CHANGED, this.state.gameData.player.prestige, -2);
	}
}