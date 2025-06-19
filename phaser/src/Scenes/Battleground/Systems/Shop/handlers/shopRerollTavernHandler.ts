import { Shop } from "../Shop";
import { GameEvents } from "../../../../..//constants/events";
import * as constants from "../../../../..//constants/constants";
import { UserMessagePayload } from "../../../../..//Models/EventPayloads";
import { updatePlayerGoldIO } from "../../../../..//Models/Entities/Force";

export function shopRerollTavernHandler(shopInstance: Shop): void {
	const { scene, state } = shopInstance;

	if (state.gameData.player.gold < constants.REROLL_UNITS_PRICE) {
		scene.events.emit(GameEvents.USER_MESSAGE_REQUESTED, {
			text: `Not enough gold to reroll (cost: ${constants.REROLL_UNITS_PRICE})`,
			type: 'error'
		} as UserMessagePayload);
		return;
	}

	// Deduct gold and reroll
	updatePlayerGoldIO(scene, -constants.REROLL_UNITS_PRICE);
	shopInstance.rerollTavern();
}

