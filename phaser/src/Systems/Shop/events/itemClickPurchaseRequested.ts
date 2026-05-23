import { Unit } from "@Models/Entities/Unit";
import { getGameController } from "@Core/GameControllerFactory";

/**
 * Handle a unit purchase request from the shop
 *
 * This function has been refactored to use the event-driven architecture:
 * 1. Use pure functions to determine what should happen
 * 2. Emit only failure events for immediate UI feedback
 * 3. Delegate successful purchase flow to GameController/server phase sync
 */
export async function itemClickPurchaseRequested(
	shopUnitData: Unit,
	_shopCharaId: string,
	_dragStartX: number,
	_dragStartY: number
): Promise<void> {

	const controller = getGameController();
	const serverSuccess = await controller.purchaseUnit(shopUnitData.cardId);

	if (!serverSuccess) {
		throw new Error("Purchase failed on server");
	}

}
