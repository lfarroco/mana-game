import Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as Board from "@Models/Board";
import { getState } from "@Models/State";
import { processOwnedUnitMoveRequest } from "@Systems/Chara/input";
import {
	BoardCursorState,
	clearBoardSelection,
	createInitialBoardCursorState,
	moveBoardCursor,
	resolveBoardConfirm,
} from "@Systems/Controls/boardCursorModel";
import { NavigationDirection } from "@Systems/Controls/intents";

const CURSOR_BORDER_COLOR = 0xffffff;
const CURSOR_BORDER_ALPHA = 0.8;
const SELECTED_BORDER_COLOR = 0xffd700;
const SELECTED_BORDER_ALPHA = 1;
const BORDER_WIDTH = 4;
const BORDER_PADDING = 6;

export type BoardCursorController = {
	move: (direction: NavigationDirection) => void;
	confirm: () => boolean;
	cancel: () => boolean;
	canInteract: () => boolean;
	setVisualActive: (active: boolean) => void;
	refresh: () => void;
	destroy: () => void;
	getState: () => BoardCursorState;
};

const drawTileOutline = (
	graphics: Phaser.GameObjects.Graphics,
	tile: Vec2,
	color: number,
	alpha: number
) => {
	const position = Board.getSlotPosition(tile.y * 3 + tile.x, true);
	graphics.clear();
	graphics.lineStyle(BORDER_WIDTH, color, alpha);
	graphics.strokeRoundedRect(
		position.x - constants.TILE_WIDTH / 2 - BORDER_PADDING,
		position.y - constants.TILE_HEIGHT / 2 - BORDER_PADDING,
		constants.TILE_WIDTH + BORDER_PADDING * 2,
		constants.TILE_HEIGHT + BORDER_PADDING * 2,
		12
	);
};

export const createBoardCursorController = (scene: Phaser.Scene): BoardCursorController => {
	const cursorGraphics = scene.add.graphics();
	const selectedGraphics = scene.add.graphics();
	let state = createInitialBoardCursorState(getState().session.team.units);
	let visualActive = true;

	const refresh = () => {
		if (!Board.isInputEnabled() || !visualActive) {
			cursorGraphics.setVisible(false);
			selectedGraphics.setVisible(false);
			if (!Board.isInputEnabled()) {
				state = clearBoardSelection(state);
			}
			return;
		}

		cursorGraphics.setVisible(true);
		drawTileOutline(cursorGraphics, state.cursor, CURSOR_BORDER_COLOR, CURSOR_BORDER_ALPHA);

		const selectedUnit = getState().session.team.units.find((unit) => unit.id === state.selectedUnitId);
		if (!selectedUnit) {
			selectedGraphics.clear();
			selectedGraphics.setVisible(false);
			return;
		}

		selectedGraphics.setVisible(true);
		drawTileOutline(
			selectedGraphics,
			selectedUnit.position,
			SELECTED_BORDER_COLOR,
			SELECTED_BORDER_ALPHA
		);
	};

	const move = (direction: NavigationDirection) => {
		if (!Board.isInputEnabled()) {
			return;
		}

		state = moveBoardCursor(state, direction);
		refresh();
	};

	const confirm = (): boolean => {
		if (!Board.isInputEnabled()) {
			return false;
		}

		const result = resolveBoardConfirm(state, getState().session.team.units);
		state = result.nextState;

		if (result.move) {
			const dragStart = Board.getSlotPosition(result.move.from.y * 3 + result.move.from.x, true);
			processOwnedUnitMoveRequest(result.move.unitId, result.move.to, dragStart.x, dragStart.y);
		}

		refresh();
		return true;
	};

	const cancel = (): boolean => {
		if (!state.selectedUnitId) {
			return false;
		}

		state = clearBoardSelection(state);
		refresh();
		return true;
	};

	const destroy = () => {
		cursorGraphics.destroy();
		selectedGraphics.destroy();
	};

	refresh();

	return {
		move,
		confirm,
		cancel,
		canInteract: () => Board.isInputEnabled(),
		setVisualActive: (active: boolean) => {
			visualActive = active;
			refresh();
		},
		refresh,
		destroy,
		getState: () => state,
	};
};