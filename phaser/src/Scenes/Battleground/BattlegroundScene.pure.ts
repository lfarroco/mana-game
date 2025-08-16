import { Unit } from "../../Models/Entities/Unit";
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

export function handleOwnedUnitSold(
	updatePlayerGold: (amount: number) => void,
	hideSellZone: () => void,
	units: Unit[],
	unitId: string,
	soldForGold: number,
	chara: { destroy: () => void; x: number; y: number } | undefined,
	showPopText: (x: number, y: number, text: string, type: string, direction: string) => void
): Unit[] {
	// Update player gold
	updatePlayerGold(soldForGold);

	// Get position and destroy character
	const popTextX = chara?.x ?? 400; // Default fallback position
	const popTextY = chara?.y ?? 300; // Default fallback position
	chara?.destroy();

	showPopText(popTextX, popTextY, `+${soldForGold}G`, "shield", "up");

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
 * Pure function to handle move/swap results with direct callbacks
 * @param moveResult - Result from PlayerBoard.updateUnitPosition
 * @param getVisualPosition - Function to get visual position for a unit
 * @param onMoveAccepted - Callback for when a unit move is accepted
 * @param onSwapAccepted - Callback for when a unit swap is accepted
 * @returns void (executes callbacks directly)
 */
export function handleMoveResult(
	moveResult: {
		movedUnit: Unit;
		swappedUnit?: Unit;
		oldPositionOfMovedUnit: Vec2;
	},
	getVisualPosition: (unit: Unit) => Vec2,
	onMoveAccepted: (unitId: string, newLogicalPosition: Vec2, newVisualPosition: { x: number, y: number }) => void,
	onSwapAccepted: (
		movedUnitId: string,
		movedUnitNewLogicalPosition: Vec2,
		movedUnitVisualPosition: { x: number, y: number },
		swappedUnitId: string,
		swappedUnitNewLogicalPosition: Vec2,
		swappedUnitVisualPosition: { x: number, y: number }
	) => void
): void {
	const movedUnitVisualPosition = getVisualPosition(moveResult.movedUnit);

	if (moveResult.swappedUnit) {
		const swappedUnitVisualPosition = getVisualPosition(moveResult.swappedUnit);
		onSwapAccepted(
			moveResult.movedUnit.id,
			moveResult.movedUnit.position,
			{ x: movedUnitVisualPosition.x, y: movedUnitVisualPosition.y },
			moveResult.swappedUnit.id,
			moveResult.swappedUnit.position,
			{ x: swappedUnitVisualPosition.x, y: swappedUnitVisualPosition.y }
		);
	} else {
		onMoveAccepted(
			moveResult.movedUnit.id,
			moveResult.movedUnit.position,
			{ x: movedUnitVisualPosition.x, y: movedUnitVisualPosition.y }
		);
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
 * @param onMoveAccepted - Callback for when a unit move is accepted
 * @param onSwapAccepted - Callback for when a unit swap is accepted
 * @param onMoveRejected - Callback for when a unit move is rejected
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
	onMoveAccepted: (unitId: string, newLogicalPosition: Vec2, newVisualPosition: { x: number, y: number }) => void,
	onSwapAccepted: (
		movedUnitId: string,
		movedUnitNewLogicalPosition: Vec2,
		movedUnitVisualPosition: { x: number, y: number },
		swappedUnitId: string,
		swappedUnitNewLogicalPosition: Vec2,
		swappedUnitVisualPosition: { x: number, y: number }
	) => void,
	onMoveRejected: (unitId: string, reason: string, dragStartX: number, dragStartY: number) => void
): void {
	const unitToMove = findUnitById(units, unitId);

	if (!unitToMove) {
		logError(`[BattlegroundScene] Unit with ID ${unitId} not found for move request.`);
		onMoveRejected(unitId, "UNIT_NOT_FOUND", dragStartX, dragStartY);
		return;
	}

	const moveResult = updateUnitPosition(unitToMove, targetTile, units);

	if (!moveResult) {
		onMoveRejected(unitId, "NO_CHANGE_OR_INVALID", dragStartX, dragStartY);
		return;
	}

	// Successfully moved or swapped - use the new callback approach
	handleMoveResult(moveResult, getVisualPosition, onMoveAccepted, onSwapAccepted);
}

/**
 * Pure function to safely play a sound effect with error handling
 * @param audioSystem - The audio system instance
 * @param key - The sound effect key to play
 * @param onError - Function to handle errors
 * @returns Whether the sound was played successfully
 */
export function playFxSafe(
	audioSystem: { playSoundEffect: (key: string) => void },
	key: string,
	onError: (message: string) => void
): boolean {
	try {
		audioSystem.playSoundEffect(key);
		return true;
	} catch (error) {
		onError(`Could not play sound effect ${key}: ${error}`);
		return false;
	}
}

/**
 * Pure function to handle battle result display logic
 * @param result - The battle result
 * @param playAnimation - Function to play the animation
 * @returns void
 */
export function handleBattleResultDisplay(
	result: "victory" | "defeat",
	playAnimation: (result: "victory" | "defeat") => void
): void {
	playAnimation(result);
}

/**
 * Pure function to safely execute cleanup operations
 * @param cleanupOperations - Array of cleanup functions to execute
 * @param onError - Function to handle errors during cleanup
 * @returns Array of results indicating which operations succeeded
 */
export function performCleanup(
	cleanupOperations: Array<{ name: string; operation: () => void }>,
	onError: (operationName: string, error: any) => void
): Array<{ name: string; success: boolean }> {
	return cleanupOperations.map(({ name, operation }) => {
		try {
			operation();
			return { name, success: true };
		} catch (error) {
			onError(name, error);
			return { name, success: false };
		}
	});
}

/**
 * Pure function to safely destroy game objects
 * @param gameObjects - Array of objects with destroy methods
 * @param onError - Function to handle errors during destruction
 * @returns Array of results indicating which objects were destroyed successfully
 */
export function destroyGameObjects(
	gameObjects: Array<{ name: string; object: { destroy: () => void } | null | undefined }>,
	onError: (objectName: string, error: any) => void
): Array<{ name: string; success: boolean }> {
	return gameObjects.map(({ name, object }) => {
		try {
			if (object) {
				object.destroy();
			}
			return { name, success: true };
		} catch (error) {
			onError(name, error);
			return { name, success: false };
		}
	});
}

/**
 * Pure function to handle scene time configuration
 * @param timeConfig - Configuration for time scale and tween scale
 * @param applyTimeScale - Function to apply time scale
 * @param applyTweenScale - Function to apply tween scale
 * @returns void
 */
export function configureSceneTime(
	timeConfig: { timeScale: number; tweenScale: number },
	applyTimeScale: (scale: number) => void,
	applyTweenScale: (scale: number) => void
): void {
	applyTimeScale(timeConfig.timeScale);
	applyTweenScale(timeConfig.tweenScale);
}

/**
 * Pure function to create a gold update handler
 * @param currentGold - Current player gold
 * @param goldDelta - Amount to change
 * @param updateGoldFn - Function to update the gold (pure)
 * @param emitEvent - Function to emit events
 * @returns New gold amount
 */
export function createGoldUpdateHandler(
	currentGold: number,
	goldDelta: number,
	updateGoldFn: (current: number, delta: number, emitter: (event: string, newGold: number, changeAmount: number) => void) => number,
	emitEvent: (event: string, newGold: number, changeAmount: number) => void
): number {
	return updateGoldFn(currentGold, goldDelta, emitEvent);
}

/**
 * Pure function to handle shop UI updates
 * @param time - Current time
 * @param shopUI - Shop UI object to update
 * @param updateFn - Function to update the shop UI
 * @returns void
 */
export function updateShopUI(
	time: number,
	shopUI: { update: (time: number) => void } | null | undefined,
	updateFn: (ui: { update: (time: number) => void }, time: number) => void
): void {
	if (shopUI) {
		updateFn(shopUI, time);
	}
}

/**
 * Pure function to setup event listeners with automatic lifecycle management
 * @param eventMappings - Array of event listener configurations
 * @param addEventListener - Function to add event listeners
 * @returns Array of listener configurations for cleanup
 */
export function setupEventListeners(
	eventMappings: Array<{ event: string; handler: (...args: any[]) => void; context?: any }>,
	addEventListener: (event: string, handler: (...args: any[]) => void, context?: any) => void
): Array<{ event: string; handler: (...args: any[]) => void; context?: any }> {
	const listeners: Array<{ event: string; handler: (...args: any[]) => void; context?: any }> = [];

	eventMappings.forEach(({ event, handler, context }) => {
		addEventListener(event, handler, context);
		listeners.push({ event, handler, context });
	});

	return listeners;
}
