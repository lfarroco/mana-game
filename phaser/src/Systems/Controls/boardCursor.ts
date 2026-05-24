import Phaser from "phaser";
import { GAME_CONFIG } from "@config";
import * as constants from "@Constants/constants";
import * as Board from "@Models/Board";
import { processOwnedUnitMoveRequest } from "@Systems/Chara/input";
import {
	BoardCursorState,
	clearBoardSelection,
	createInitialBoardCursorState,
	moveBoardCursor,
	resolveBoardConfirm,
} from "@Systems/Controls/boardCursorModel";
import { NavigationDirection } from "@Systems/Controls/intents";

const CURSOR_BORDER_COLOR = 0xffd700;
const CURSOR_BORDER_ALPHA = 1;
const SELECTED_BORDER_COLOR = 0xffd700;
const SELECTED_BORDER_ALPHA = 1;
const CURSOR_BLINK_MIN_ALPHA = 0.25;
const CURSOR_BLINK_DURATION_MS = 220;
const BORDER_WIDTH = 4;
const BORDER_PADDING = 6;

export type BoardCursorController = {
	move: (direction: NavigationDirection) => void;
	moveToRightmostColumn: () => void;
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
	let cursorState = createInitialBoardCursorState(state.session.team.units);
	let visualActive = true;
	let cursorBlinkTween: Phaser.Tweens.Tween | null = null;

	const startCursorBlink = () => {
		if (cursorBlinkTween) {
			return;
		}

		cursorGraphics.setAlpha(CURSOR_BORDER_ALPHA);
		cursorBlinkTween = scene.tweens.add({
			targets: cursorGraphics,
			alpha: CURSOR_BLINK_MIN_ALPHA,
			duration: CURSOR_BLINK_DURATION_MS,
			yoyo: true,
			repeat: -1,
			ease: "Sine.easeInOut",
		});
	};

	const stopCursorBlink = () => {
		if (!cursorBlinkTween) {
			return;
		}

		cursorBlinkTween.stop();
		cursorBlinkTween.remove();
		cursorBlinkTween = null;
		cursorGraphics.setAlpha(CURSOR_BORDER_ALPHA);
	};

	const refresh = () => {
		if (!GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT || !Board.isInputEnabled() || !visualActive) {
			cursorGraphics.setVisible(false);
			selectedGraphics.setVisible(false);
			stopCursorBlink();
			if (!GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT || !Board.isInputEnabled()) {
				cursorState = clearBoardSelection(cursorState);
			}
			return;
		}

		cursorGraphics.setVisible(true);
		drawTileOutline(cursorGraphics, cursorState.cursor, CURSOR_BORDER_COLOR, CURSOR_BORDER_ALPHA);

		const selectedUnit = state.session.team.units.find((unit) => unit.id === cursorState.selectedUnitId);
		if (!selectedUnit) {
			selectedGraphics.clear();
			selectedGraphics.setVisible(false);
			stopCursorBlink();
			return;
		}

		selectedGraphics.setVisible(true);
		drawTileOutline(
			selectedGraphics,
			selectedUnit.position,
			SELECTED_BORDER_COLOR,
			SELECTED_BORDER_ALPHA
		);
		startCursorBlink();
	};

	const move = (direction: NavigationDirection) => {
		if (!GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT || !Board.isInputEnabled()) {
			return;
		}

		cursorState = moveBoardCursor(cursorState, direction);
		refresh();
	};

	const moveToRightmostColumn = () => {
		if (!GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT) {
			return;
		}

		cursorState = {
			...cursorState,
			cursor: {
				x: 2,
				y: Math.max(0, Math.min(2, cursorState.cursor.y)),
			},
		};
		refresh();
	};

	const confirm = (): boolean => {
		if (!GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT || !Board.isInputEnabled()) {
			return false;
		}

		const result = resolveBoardConfirm(cursorState, state.session.team.units);
		cursorState = result.nextState;

		if (result.move) {
			const dragStart = Board.getSlotPosition(result.move.from.y * 3 + result.move.from.x, true);
			processOwnedUnitMoveRequest(result.move.unitId, result.move.to, dragStart.x, dragStart.y);
		}

		refresh();
		return true;
	};

	const cancel = (): boolean => {
		if (!GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT) {
			return false;
		}

		if (!cursorState.selectedUnitId) {
			return false;
		}

		cursorState = clearBoardSelection(cursorState);
		refresh();
		return true;
	};

	const destroy = () => {
		stopCursorBlink();
		cursorGraphics.destroy();
		selectedGraphics.destroy();
	};

	refresh();

	return {
		move,
		moveToRightmostColumn,
		confirm,
		cancel,
		canInteract: () => GAME_CONFIG.ENABLE_CONTROLLER_SUPPORT && Board.isInputEnabled(),
		setVisualActive: (active: boolean) => {
			visualActive = active;
			refresh();
		},
		refresh,
		destroy,
		getState: () => cursorState,
	};
};