import { Unit } from "../../Models/Entities/Unit";
import { Vec2, eqVec2, vec2 } from "../../Models/Geometry.pure";
import {
	GameError,
	EventHandler,
	EventContext,
	VisualPosition
} from "../../Types/CommonTypes";

type MovementResult = {
	movedUnit: Unit;
	swappedUnit?: Unit;
	oldPositionOfMovedUnit: Vec2;
};

type PositionUpdateCallback = (unit: Unit, target: Vec2, units: Unit[]) => MovementResult | null;

export function removeUnitFromPlayerState(units: Unit[], unitId: string): Unit[] {
	const unitIndex = units.findIndex(u => u.id === unitId);
	if (unitIndex > -1) {
		return units.filter(u => u.id !== unitId);
	} else {
		console.warn(`Unit with ID ${unitId} not found for selling.`);
		return [...units];
	}
}

export function calculateGoldUpdate(currentGold: number, goldDelta: number): {
	newGold: number; changeAmount: number
} {
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
	updatePlayerGold(soldForGold);

	const popTextX = chara?.x ?? 400;
	const popTextY = chara?.y ?? 300;
	chara?.destroy();

	showPopText(popTextX, popTextY, `+${soldForGold}G`, "shield", "up");

	hideSellZone();

	return removeUnitFromPlayerState(units, unitId);
}

export function updateUnitPosition(
	unitToMove: Unit,
	newBoardPosition: Vec2,
	unitsOnBoard: Unit[]
): {
	movedUnit: Unit;
	swappedUnit?: Unit;
	oldPositionOfMovedUnit: Vec2;
} | null {
	const oldPositionOfMovedUnit = vec2(unitToMove.position.x, unitToMove.position.y);

	if (eqVec2(oldPositionOfMovedUnit, newBoardPosition)) {
		return null;
	}

	const updatedUnits = unitsOnBoard.map(u => ({ ...u, position: { ...u.position } }));
	const movedUnit = updatedUnits.find(u => u.id === unitToMove.id);
	if (!movedUnit) return null;

	const occupierUnit = updatedUnits.find(u => u.id !== unitToMove.id && eqVec2(u.position, newBoardPosition));

	if (occupierUnit) {
		occupierUnit.position = oldPositionOfMovedUnit;
		movedUnit.position = newBoardPosition;
		return { movedUnit, swappedUnit: occupierUnit, oldPositionOfMovedUnit };
	} else {
		movedUnit.position = newBoardPosition;
		return { movedUnit, oldPositionOfMovedUnit };
	}
}

export function findUnitById(units: Unit[], unitId: string): Unit | undefined {
	return units.find(u => u.id === unitId);
}

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

type MovementState = {
	units: Unit[];
	unitId: string;
	targetTile: Vec2;
	dragStartX: number;
	dragStartY: number;
};

type MovementCallbacks = {
	onMoveAccepted: (unitId: string, newLogicalPosition: Vec2, newVisualPosition: VisualPosition) => void;
	onSwapAccepted: (movedUnitId: string, movedUnitNewLogicalPosition: Vec2, movedUnitVisualPosition: VisualPosition, swappedUnitId: string, swappedUnitNewLogicalPosition: Vec2, swappedUnitVisualPosition: VisualPosition) => void;
	onMoveRejected: (unitId: string, reason: string, dragStartX: number, dragStartY: number) => void;
};

type MovementServices = {
	updateUnitPosition: PositionUpdateCallback;
	getVisualPosition: (unit: Unit) => Vec2;
	logError: (message: string) => void;
};

export function validateUnitMove(
	units: Unit[],
	unitId: string,
	onError: (unitId: string, reason: string) => void
): Unit | null {
	const unitToMove = findUnitById(units, unitId);
	if (!unitToMove) {
		onError(unitId, "UNIT_NOT_FOUND");
		return null;
	}
	return unitToMove;
}

export function executeUnitMove(
	unit: Unit,
	targetTile: Vec2,
	units: Unit[],
	updatePosition: PositionUpdateCallback,
	onInvalidMove: (unitId: string, reason: string) => void
): MovementResult | null {
	const moveResult = updatePosition(unit, targetTile, units);
	if (!moveResult) {
		onInvalidMove(unit.id, "NO_CHANGE_OR_INVALID");
		return null;
	}
	return moveResult;
}

export function handleUnitMoveRequest(
	state: MovementState,
	services: MovementServices,
	callbacks: MovementCallbacks
) {
	const { units, unitId, targetTile, dragStartX, dragStartY } = state;
	const { updateUnitPosition, getVisualPosition, logError } = services;
	const { onMoveAccepted, onSwapAccepted, onMoveRejected } = callbacks;

	const unit = validateUnitMove(units, unitId, (id, reason) => {
		logError(`[BattlegroundScene] Unit with ID ${id} not found for move request.`);
		onMoveRejected(id, reason, dragStartX, dragStartY);
	});

	if (!unit) return;

	const moveResult = executeUnitMove(unit, targetTile, units, updateUnitPosition, (id, reason) => {
		onMoveRejected(id, reason, dragStartX, dragStartY);
	});

	if (!moveResult) return;

	handleMoveResult(moveResult, getVisualPosition, onMoveAccepted, onSwapAccepted);
}

export function createUnitMoveProcessor(services: MovementServices) {
	return function processMove(state: MovementState, callbacks: MovementCallbacks) {
		const { units, unitId, targetTile, dragStartX, dragStartY } = state;
		const { updateUnitPosition, getVisualPosition, logError } = services;
		const { onMoveAccepted, onSwapAccepted, onMoveRejected } = callbacks;

		const unit = validateUnitMove(units, unitId, (id, reason) => {
			logError(`[BattlegroundScene] Unit with ID ${id} not found for move request.`);
			onMoveRejected(id, reason, dragStartX, dragStartY);
		});
		if (!unit) return;

		const moveResult = executeUnitMove(unit, targetTile, units, updateUnitPosition, (id, reason) => {
			onMoveRejected(id, reason, dragStartX, dragStartY);
		});
		if (!moveResult) return;

		handleMoveResult(moveResult, getVisualPosition, onMoveAccepted, onSwapAccepted);
	}
}

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

export function handleBattleResultDisplay(
	result: "victory" | "defeat",
	playAnimation: (result: "victory" | "defeat") => void
): void {
	playAnimation(result);
}

export function performCleanup(
	cleanupOperations: Array<{ name: string; operation: () => void }>,
	onError: (operationName: string, error: GameError) => void
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

export function destroyGameObjects(
	gameObjects: Array<{ name: string; object: { destroy: () => void } | null | undefined }>,
	onError: (objectName: string, error: GameError) => void
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

export function configureSceneTime(
	timeConfig: { timeScale: number; tweenScale: number },
	applyTimeScale: (scale: number) => void,
	applyTweenScale: (scale: number) => void
): void {
	applyTimeScale(timeConfig.timeScale);
	applyTweenScale(timeConfig.tweenScale);
}

export function createGoldUpdateHandler(
	currentGold: number,
	goldDelta: number,
	updateGoldFn: (current: number, delta: number, emitter: (event: string, newGold: number, changeAmount: number) => void) => number,
	emitEvent: (event: string, newGold: number, changeAmount: number) => void
): number {
	return updateGoldFn(currentGold, goldDelta, emitEvent);
}

export function updateShopUI(
	time: number,
	shopUI: { update: (time: number) => void } | null | undefined,
	updateFn: (ui: { update: (time: number) => void }, time: number) => void
): void {
	if (shopUI) {
		updateFn(shopUI, time);
	}
}

export function setupEventListeners(
	eventMappings: Array<{ event: string; handler: EventHandler; context?: EventContext }>,
	addEventListener: (event: string, handler: EventHandler, context?: EventContext) => void
): Array<{ event: string; handler: EventHandler; context?: EventContext }> {
	const listeners: Array<{ event: string; handler: EventHandler; context?: EventContext }> = [];

	eventMappings.forEach(({ event, handler, context }) => {
		addEventListener(event, handler, context);
		listeners.push({ event, handler, context });
	});

	return listeners;
}
