import { Unit, upgradeUnitData } from "@Models/Entities/Unit";
import { getState } from "@Models/State";
import { getName } from "@i18n/i18n";
import { getGameController } from "@Core/GameControllerFactory";
import * as PureShop from "../PureShop";
import { emitSystemEvent } from "../../../Engine/Visualizer";

/**
 * Handle a unit purchase request from the shop
 * 
 * This function has been refactored to use the event-driven architecture:
 * 1. Use pure functions to determine what should happen
 * 2. Call the GameController for server validation
 * 3. Emit events for the Visualizer to handle visual updates
 */
export async function itemClickPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	dragStartX: number,
	dragStartY: number
): Promise<void> {
	const state = getState();

	// Step 1: Use pure function to validate and determine purchase outcome
	const purchaseResult = PureShop.processPurchase(
		state.session,
		shopUnitData.cardId,
		shopCharaId,
		{ x: dragStartX, y: dragStartY }
	);

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

	// Step 3: Update game state
	if (purchaseResult.upgradedUnit) {
		// Upgrade existing unit
		const existingUnit = state.session.team.units.find(
			(u) => u.id === purchaseResult.upgradedUnit!.id
		);
		if (existingUnit) {
			upgradeUnitData(existingUnit);
		}
	} else if (purchaseResult.newUnit) {
		// Add new unit to state
		state.session.team.units = PureShop.addUnitToUnits(
			state.session.team.units,
			purchaseResult.newUnit
		);

		// Update run stats
		const { runStats } = state.session;
		if (runStats) {
			runStats.totalUnitsRecruited++;
			const unitName = getName(purchaseResult.newUnit.cardId);
			runStats.unitUsage[unitName] = (runStats.unitUsage[unitName] || 0) + 1;
		}
	}

	// Step 4: Emit success events for the Visualizer to handle visual updates
	for (const event of purchaseResult.events) {
		await emitSystemEvent(event);
	}
}
