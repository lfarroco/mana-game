import { Unit } from "@Models/Entities/Unit";
import { getState } from "@Models/State";
import { getName } from "@i18n/i18n";
import { getGameController } from "@Core/GameControllerFactory";
import * as PureShop from "@Systems/Shop/PureShop";
import { emitSystemEvent } from "@Engine/Visualizer";

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
	shopCharaId: string,
	dragStartX: number,
	dragStartY: number
): Promise<void> {
	const state = getState();

	// Step 1: Use pure function to validate and determine purchase outcome
	const purchaseResult = PureShop.processPurchase(state.session, shopUnitData.cardId, shopCharaId, {
		x: dragStartX,
		y: dragStartY,
	});

	// If validation failed, emit failure events and return
	if (!purchaseResult.success) {
		for (const event of purchaseResult.events) {
			await emitSystemEvent(event);
		}
		return;
	}

	// Step 2: Call GameController for server validation
	const controller = getGameController();
	const serverSuccess = await controller.purchaseUnit(shopUnitData.cardId);

	if (!serverSuccess) {
		// Server rejected the purchase - emit failure event
		const failureEvent = {
			type: "PurchaseFailed" as const,
			timestamp: Date.now(),
			cardId: shopUnitData.cardId,
			unitName: getName(shopUnitData.cardId),
			reason: "SERVER_REJECTED",
			shopCharaId,
			dragStartPosition: { x: dragStartX, y: dragStartY },
		};
		await emitSystemEvent(failureEvent);
		return;
	}

	// Success path is now fully driven by server-synced phase rendering in GameController.
	// Do not mutate local state or emit UnitPurchased visuals here.
}
