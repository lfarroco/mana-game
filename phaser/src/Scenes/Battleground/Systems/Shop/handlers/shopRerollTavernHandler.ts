import { Shop } from "../Shop";
import * as constants from "../../../../..//constants/constants";
import { updatePlayerGoldIO } from "../../../../..//Models/Entities/Force";

export function shopRerollTavernHandler(shopInstance: Shop): void {
	const { scene, state } = shopInstance;

	if (state.gameData.player.gold < constants.REROLL_UNITS_PRICE) {

		scene.uiManager._handleUserMessageRequested({
			text: `Not enough gold to reroll (cost: ${constants.REROLL_UNITS_PRICE})`,
			type: 'error'
		})

		return;
	}

	// Deduct gold and reroll
	updatePlayerGoldIO(-constants.REROLL_UNITS_PRICE);
	shopInstance.rerollTavern();
}

