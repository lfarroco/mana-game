/**
 * Pure Shop System
 * 
 * This module contains pure functions for shop operations that return events
 * instead of directly manipulating game state or Phaser objects.
 * 
 * These functions follow functional programming principles:
 * - Accept state as input
 * - Return events describing what should happen
 * - No side effects (no state mutation, no Phaser calls)
 */

import * as constants from "@Constants/constants";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import * as Board from "@Models/Board";
import { getName } from "@i18n/i18n";
import { SessionData } from "@Core/Types";
import * as SystemEvents from "@Systems/Events";

/**
 * Result type for purchase operations
 */
export type PurchaseResult = {
	success: boolean;
	events: SystemEvents.AllSystemEvents[];
	newUnit?: Unit;
	upgradedUnit?: Unit;
	error?: string;
};

/**
 * Pure function to handle unit purchase logic
 * 
 * @param session - Current session data
 * @param shopUnitCardId - Card ID being purchased
 * @param shopCharaId - ID of the shop character clicked
 * @param dragStartPosition - Position where drag started (for animation)
 * @returns Purchase result with events to emit
 */
export function processPurchase(
	session: SessionData,
	shopUnitCardId: string,
	shopCharaId: string,
	dragStartPosition: { x: number; y: number }
): PurchaseResult {
	const events: SystemEvents.AllSystemEvents[] = [];

	// Check if unit already exists (for upgrade)
	const existingUnit = session.team.units.find(
		(u: Unit) => u.cardId === shopUnitCardId
	);

	// Find empty slot for new unit
	const targetTile = Board.getEmptySlot(
		session.team.units,
		constants.FORCE_ID_PLAYER
	);

	// Validation: Check party size limit
	const isUpgradable = existingUnit && existingUnit.rank <= 3;
	const needsNewSlot = !isUpgradable;

	if (needsNewSlot && session.team.units.length >= constants.MAX_PARTY_SIZE) {
		// Party is full
		const failureEvent = SystemEvents.createPurchaseFailedEvent(
			shopUnitCardId,
			getName(shopUnitCardId),
			"PARTY_FULL",
			shopCharaId,
			dragStartPosition
		);
		events.push(failureEvent);

		return {
			success: false,
			events,
			error: "PARTY_FULL",
		};
	}

	if (needsNewSlot && !targetTile) {
		// No empty slot available
		const failureEvent = SystemEvents.createPurchaseFailedEvent(
			shopUnitCardId,
			getName(shopUnitCardId),
			"PARTY_FULL",
			shopCharaId,
			dragStartPosition
		);
		events.push(failureEvent);

		return {
			success: false,
			events,
			error: "NO_EMPTY_SLOT",
		};
	}

	// Purchase is valid - determine if it's an upgrade or new unit
	if (isUpgradable) {
		// Upgrade existing unit
		const upgradedUnit = { ...existingUnit };
		upgradedUnit.rank = existingUnit.rank + 1;

		const purchaseEvent = SystemEvents.createUnitPurchasedEvent(
			shopUnitCardId,
			shopCharaId,
			true,
			undefined,
			upgradedUnit
		);
		events.push(purchaseEvent);

		return {
			success: true,
			events,
			upgradedUnit,
		};
	} else if (targetTile) {
		// Create new unit
		const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitCardId, targetTile);

		const purchaseEvent = SystemEvents.createUnitPurchasedEvent(
			shopUnitCardId,
			shopCharaId,
			false,
			newUnit,
			undefined
		);
		events.push(purchaseEvent);

		return {
			success: true,
			events,
			newUnit,
		};
	}

	// Should not reach here, but handle as error
	const failureEvent = SystemEvents.createPurchaseFailedEvent(
		shopUnitCardId,
		getName(shopUnitCardId),
		"UNKNOWN_ERROR",
		shopCharaId,
		dragStartPosition
	);
	events.push(failureEvent);

	return {
		success: false,
		events,
		error: "UNKNOWN_ERROR",
	};
}

/**
 * Pure function to handle unit sale logic
 * 
 * @param session - Current session data
 * @param unitId - ID of unit being sold
 * @returns Events to emit
 */
export function processSale(
	session: SessionData,
	unitId: string
): SystemEvents.AllSystemEvents[] {
	const events: SystemEvents.AllSystemEvents[] = [];

	// Validate unit exists
	const unit = session.team.units.find((u: Unit) => u.id === unitId);
	if (!unit) {
		console.warn(`Unit with ID ${unitId} not found for sale`);
		return events;
	}

	// Create sale event
	const saleEvent = SystemEvents.createUnitSoldEvent(unitId);
	events.push(saleEvent);

	return events;
}

/**
 * Helper function to remove a unit from the player's units array
 * This is a pure function that returns a new array
 * 
 * @param units - Current units array
 * @param unitId - ID of unit to remove
 * @returns New units array without the sold unit
 */
export function removeUnitFromUnits(units: Unit[], unitId: string): Unit[] {
	return units.filter((u) => u.id !== unitId);
}

/**
 * Helper function to add a unit to the player's units array
 * This is a pure function that returns a new array
 * 
 * @param units - Current units array
 * @param unit - Unit to add
 * @returns New units array with the new unit
 */
export function addUnitToUnits(units: Unit[], unit: Unit): Unit[] {
	return [...units, unit];
}

/**
 * Helper function to update a unit in the player's units array
 * This is a pure function that returns a new array
 * 
 * @param units - Current units array
 * @param updatedUnit - Updated unit data
 * @returns New units array with the updated unit
 */
export function updateUnitInUnits(units: Unit[], updatedUnit: Unit): Unit[] {
	return units.map((u) => (u.id === updatedUnit.id ? updatedUnit : u));
}
