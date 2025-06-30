import { Unit } from "../../Models/Entities/Unit";
import { GameEvents } from "../../constants/events";
import { Vec2, eqVec2 } from "../../Utils/Vec2";

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
	newBoardPosition: Vec2,
	unitsOnBoard: Unit[]
): {
	movedUnit: Unit;
	swappedUnit?: Unit;
	oldPositionOfMovedUnit: Vec2;
} | null {
	const oldPositionOfMovedUnit = { x: unitToMove.position.x, y: unitToMove.position.y };

	if (eqVec2(oldPositionOfMovedUnit, newBoardPosition)) {
		return null; // No change in position
	}

	// Create copies to avoid mutating the input
	const updatedUnits = unitsOnBoard.map(u => ({ ...u, position: { ...u.position } }));
	const movedUnit = updatedUnits.find(u => u.id === unitToMove.id);
	if (!movedUnit) return null;

	const occupierUnit = updatedUnits.find(u => u.id !== unitToMove.id && eqVec2(u.position, newBoardPosition));

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

/**
 * Pure function to find a unit by ID in the units array
 * @param units - Array of units to search through
 * @param unitId - ID of the unit to find
 * @returns The unit if found, undefined otherwise
 */
export function findUnitById(units: Unit[], unitId: string): Unit | undefined {
	return units.find(u => u.id === unitId);
}

/**
 * Pure function to create event payloads for move/swap results
 * @param moveResult - Result from PlayerBoard.updateUnitPosition
 * @param getVisualPosition - Function to get visual position for a unit
 * @returns Object with event type and payload to emit
 */
export function createMoveEventPayload(
	moveResult: {
		movedUnit: Unit;
		swappedUnit?: Unit;
		oldPositionOfMovedUnit: Vec2;
	},
	getVisualPosition: (unit: Unit) => Vec2
): {
	eventType: string;
	payload: any;
} {
	const movedUnitVisualPosition = getVisualPosition(moveResult.movedUnit);

	if (moveResult.swappedUnit) {
		const swappedUnitVisualPosition = getVisualPosition(moveResult.swappedUnit);
		return {
			eventType: GameEvents.OWNED_UNIT_SWAP_ACCEPTED,
			payload: {
				movedUnitId: moveResult.movedUnit.id,
				movedUnitNewLogicalPosition: moveResult.movedUnit.position,
				movedUnitVisualPosition: { x: movedUnitVisualPosition.x, y: movedUnitVisualPosition.y },
				swappedUnitId: moveResult.swappedUnit.id,
				swappedUnitNewLogicalPosition: moveResult.swappedUnit.position,
				swappedUnitVisualPosition: { x: swappedUnitVisualPosition.x, y: swappedUnitVisualPosition.y },
			}
		};
	} else {
		return {
			eventType: GameEvents.OWNED_UNIT_MOVE_ACCEPTED,
			payload: {
				unitId: moveResult.movedUnit.id,
				newLogicalPosition: moveResult.movedUnit.position,
				newVisualPosition: { x: movedUnitVisualPosition.x, y: movedUnitVisualPosition.y },
			}
		};
	}
}

/**
 * Pure function to handle unit move request logic with dependency injection
 * @param units - Array of player units
 * @param unitId - ID of unit to move
 * @param targetTile - Target position
 * @param dragStartX - X coordinate where drag started
 * @param dragStartY - Y coordinate where drag started
 * @param updateUnitPosition - Function to update unit position (from PlayerBoard)
 * @param getVisualPosition - Function to get visual position for a unit
 * @param logError - Function to log errors
 * @param emitEvent - Function to emit events
 * @returns void (side effects through injected functions)
 */
export function handleUnitMoveRequestPure(
	units: Unit[],
	unitId: string,
	targetTile: any, // Accept any Vec2-like object (with x, y properties)
	dragStartX: number,
	dragStartY: number,
	updateUnitPosition: (unit: Unit, target: any, units: Unit[]) => any,
	getVisualPosition: (unit: Unit) => Vec2,
	logError: (message: string) => void,
	emitEvent: (eventType: string, payload: any) => void
): void {
	const unitToMove = findUnitById(units, unitId);

	if (!unitToMove) {
		logError(`[BattlegroundScene] Unit with ID ${unitId} not found for move request.`);
		emitEvent(GameEvents.OWNED_UNIT_MOVE_REJECTED, {
			unitId,
			reason: "UNIT_NOT_FOUND",
			dragStartX,
			dragStartY
		});
		return;
	}

	const moveResult = updateUnitPosition(unitToMove, targetTile, units);

	if (!moveResult) {
		emitEvent(GameEvents.OWNED_UNIT_MOVE_REJECTED, {
			unitId,
			reason: "NO_CHANGE_OR_INVALID",
			dragStartX,
			dragStartY
		});
		return;
	}

	// Successfully moved or swapped
	const eventData = createMoveEventPayload(moveResult, getVisualPosition);
	emitEvent(eventData.eventType, eventData.payload);
}
