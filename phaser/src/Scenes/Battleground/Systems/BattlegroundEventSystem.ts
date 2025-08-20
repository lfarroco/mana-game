import { PartyBoard } from "../../../Models/Board";
import { Shop } from "./Shop/Shop";
import { BattlegroundScene } from "../BattlegroundScene";
import * as MoraleDisplay from "../MoraleDisplay";

export class BattlegroundEventSystem {
	playerBoard: PartyBoard;
	shop: Shop;

	constructor(scene: BattlegroundScene) {
		this.playerBoard = scene.playerBoard;
		this.shop = scene.shop;
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