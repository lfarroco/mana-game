import { PartyBoard } from "../../../Models/Board";
import { BattlegroundScene } from "../BattlegroundScene";
import * as MoraleDisplay from "../MoraleDisplay";

export class BattlegroundEventSystem {
	playerBoard: PartyBoard;

	constructor(scene: BattlegroundScene) {
		this.playerBoard = scene.playerBoard;
	}

	handleEnemyBoardShow(): void {
		if (this.playerBoard) {
			this.playerBoard.setEnemyBoardVisible(true);
		}
	}

	private initializeMoraleDisplay(): void {
		try {
			MoraleDisplay.init();
		} catch (error) {
			console.error("Failed to initialize MoraleDisplay:", error);
		}
	}

	private initializeSystems(): void {
		this.initializeMoraleDisplay();
	}


	registerEventHandlers(): void {

		this.initializeSystems();
	}

	destroy(): void {
		MoraleDisplay.destroy();
	}
}