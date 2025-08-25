import * as Shop from "../Shop";
import * as constants from "../../../../../constants/constants";
import { updatePlayerGoldIO } from "../../../../../Models/Entities/Force";
import * as UIManager from "../../../../../UI/UIManager";
import { getState } from "../../../../../Models/State";

export function rerollTavern(): void {

	if (getState().gameData.player.gold < constants.REROLL_UNITS_PRICE) {

		UIManager.handleUserMessageRequested({
			text: `Not enough gold to reroll (cost: ${constants.REROLL_UNITS_PRICE})`,
			type: 'error'
		})

		return;
	}

	updatePlayerGoldIO(-constants.REROLL_UNITS_PRICE);
	Shop.rerollTavern();
}

