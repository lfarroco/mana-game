import { FORCE_ID_PLAYER } from "@Constants/constants";
import { Unit } from "@Models/Entities/Unit";
import { vec2 } from "@Models/Geometry";
import { NavigationDirection } from "@Systems/Controls/intents";

export type BoardCursorState = {
	cursor: Vec2;
	selectedUnitId: string | null;
};

export type BoardMoveIntent = {
	unitId: string;
	from: Vec2;
	to: Vec2;
};

type ConfirmResult = {
	nextState: BoardCursorState;
	move?: BoardMoveIntent;
};

const clampToBoard = (value: number): number => Math.max(0, Math.min(2, value));

const getPlayerUnits = (units: Unit[]): Unit[] => units.filter((unit) => unit.force === FORCE_ID_PLAYER);

const getUnitAtCursor = (units: Unit[], cursor: Vec2): Unit | undefined => {
	return getPlayerUnits(units).find(
		(unit) => unit.position.x === cursor.x && unit.position.y === cursor.y
	);
};

const getSelectedUnit = (units: Unit[], selectedUnitId: string | null): Unit | undefined => {
	if (!selectedUnitId) {
		return undefined;
	}

	return getPlayerUnits(units).find((unit) => unit.id === selectedUnitId);
};

export const createInitialBoardCursorState = (units: Unit[]): BoardCursorState => {
	const firstPlayerUnit = [...getPlayerUnits(units)].sort((left, right) => {
		if (left.position.y !== right.position.y) {
			return left.position.y - right.position.y;
		}
		return left.position.x - right.position.x;
	})[0];

	return {
		cursor: firstPlayerUnit ? vec2(firstPlayerUnit.position.x, firstPlayerUnit.position.y) : vec2(1, 1),
		selectedUnitId: null,
	};
};

export const moveBoardCursor = (
	state: BoardCursorState,
	direction: NavigationDirection
): BoardCursorState => {
	switch (direction) {
		case "up":
			return { ...state, cursor: vec2(state.cursor.x, clampToBoard(state.cursor.y - 1)) };
		case "down":
			return { ...state, cursor: vec2(state.cursor.x, clampToBoard(state.cursor.y + 1)) };
		case "left":
			return { ...state, cursor: vec2(clampToBoard(state.cursor.x - 1), state.cursor.y) };
		case "right":
			return { ...state, cursor: vec2(clampToBoard(state.cursor.x + 1), state.cursor.y) };
		default:
			return state;
	}
};

export const clearBoardSelection = (state: BoardCursorState): BoardCursorState => ({
	...state,
	selectedUnitId: null,
});

export const resolveBoardConfirm = (state: BoardCursorState, units: Unit[]): ConfirmResult => {
	const selectedUnit = getSelectedUnit(units, state.selectedUnitId);
	if (!selectedUnit) {
		const hoveredUnit = getUnitAtCursor(units, state.cursor);
		if (!hoveredUnit) {
			return { nextState: state };
		}

		return {
			nextState: {
				...state,
				selectedUnitId: hoveredUnit.id,
			},
		};
	}

	if (selectedUnit.position.x === state.cursor.x && selectedUnit.position.y === state.cursor.y) {
		return {
			nextState: clearBoardSelection(state),
		};
	}

	return {
		nextState: clearBoardSelection(state),
		move: {
			unitId: selectedUnit.id,
			from: vec2(selectedUnit.position.x, selectedUnit.position.y),
			to: vec2(state.cursor.x, state.cursor.y),
		},
	};
};