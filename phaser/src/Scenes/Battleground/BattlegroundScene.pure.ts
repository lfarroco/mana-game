import { Unit } from "../../Models/Entities/Unit";
import { GameEvents } from "../../constants/events";
import { Vec2Pure, eqVec2Pure } from "./types.pure";

/**
 * Pure function to remove a unit from the player's units array
 * @param units - Array of units to search through
 * @param unitId - ID of the unit to remove
 * @returns New array with the unit removed
 */
export function removeUnitFromPlayerState(units: Unit[], unitId: string): Unit[] {
	const unitIndex = units.findIndex(u => u.id === unitId);
	if (unitIndex > -1) {
		return units.filter(u => u.id !== unitId);
	} else {
		console.warn(`Unit with ID ${unitId} not found for selling.`);
		return [...units]; // Return a new array even when no unit is found
	}
}

/**
 * Pure function to calculate new gold amount and return the change details
 * @param currentGold - Current player gold amount
 * @param goldDelta - Amount to change (can be positive or negative)
 * @returns Object with newGold amount and changeAmount (floored)
 */
export function calculateGoldUpdate(currentGold: number, goldDelta: number): { newGold: number; changeAmount: number } {
	const changeAmount = Math.floor(goldDelta);
	const newGold = currentGold + changeAmount;
	return { newGold, changeAmount };
}

/**
 * Pure function to update player gold with dependency injection
 * @param currentGold - Current player gold amount
 * @param goldDelta - Amount to change
 * @param emitEvent - Function to emit events
 * @returns New gold amount
 */
export function updatePlayerGold(
	currentGold: number,
	goldDelta: number,
	emitEvent: (event: string, newGold: number, changeAmount: number) => void
): number {
	const { newGold, changeAmount } = calculateGoldUpdate(currentGold, goldDelta);
	emitEvent(GameEvents.GOLD_CHANGED, newGold, changeAmount);
	return newGold;
}

/**
 * Pure function to handle the complete unit selling logic with dependency injection
 * @param updatePlayerGold - Function to update player gold
 * @param emitEvent - Function to emit events
 * @param hideSellZone - Function to hide sell zone
 * @param units - Current array of player units
 * @param unitId - ID of the unit being sold
 * @param soldForGold - Amount of gold the unit was sold for
 * @param chara - The character object to destroy (can be undefined)
 * @returns New array of units with the sold unit removed
 */
export function handleOwnedUnitSold(
	updatePlayerGold: (amount: number) => void,
	emitEvent: (event: string, payload: any) => void,
	hideSellZone: () => void,
	units: Unit[],
	unitId: string,
	soldForGold: number,
	chara?: { destroy: () => void; x: number; y: number }
): Unit[] {
	// Update player gold
	updatePlayerGold(soldForGold);

	// Get position and destroy character
	const popTextX = chara?.x ?? 400; // Default fallback position
	const popTextY = chara?.y ?? 300; // Default fallback position
	chara?.destroy();

	// Emit PopText for gold gain
	emitEvent(GameEvents.POP_TEXT_SHOW, {
		text: `+${soldForGold}G`,
		x: popTextX,
		y: popTextY,
		type: "success",
	});

	// Hide the sell zone
	hideSellZone();

	// Remove unit from player's state and return new array
	return removeUnitFromPlayerState(units, unitId);
}

/**
 * Pure function to update a unit's position, handling swaps and moves
 * @param unitToMove - The unit to move
 * @param newBoardPosition - Target position
 * @param unitsOnBoard - Array of all units on the board
 * @returns Result object with moved unit and optional swapped unit, or null if no change
 */
export function updateUnitPosition(
	unitToMove: Unit,
	newBoardPosition: Vec2Pure,
	unitsOnBoard: Unit[]
): {
	movedUnit: Unit;
	swappedUnit?: Unit;
	oldPositionOfMovedUnit: Vec2Pure;
} | null {
	const oldPositionOfMovedUnit = { x: unitToMove.position.x, y: unitToMove.position.y };

	if (eqVec2Pure(oldPositionOfMovedUnit, newBoardPosition)) {
		return null; // No change in position
	}

	// Create copies to avoid mutating the input
	const updatedUnits = unitsOnBoard.map(u => ({ ...u, position: { ...u.position } }));
	const movedUnit = updatedUnits.find(u => u.id === unitToMove.id);
	if (!movedUnit) return null;

	const occupierUnit = updatedUnits.find(u => u.id !== unitToMove.id && eqVec2Pure(u.position, newBoardPosition));

	if (occupierUnit) {
		// Swap positions - need to preserve the tag property for Unit's Vec2
		occupierUnit.position = { tag: "_vec2" as const, ...oldPositionOfMovedUnit };
		movedUnit.position = { tag: "_vec2" as const, ...newBoardPosition };
		return { movedUnit, swappedUnit: occupierUnit, oldPositionOfMovedUnit };
	} else {
		// Move to empty slot
		movedUnit.position = { tag: "_vec2" as const, ...newBoardPosition };
		return { movedUnit, oldPositionOfMovedUnit };
	}
}
