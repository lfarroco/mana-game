import * as constants from "@Constants";
import { Unit } from "@game/Models";
import * as EnergySlot from "@Components/EnergySlot/EnergySlot";
import * as BoardLogic from "@game/BoardLogic";
import { isSome } from "@game/Functional";
import * as Layout from "@game/board/layout";
import { env } from "@Env";

export interface BoardState {
	slotShaders: EnergySlot.EnergySlot[];
	dropZones: Phaser.GameObjects.Zone[];
	cpuSlotShaders: EnergySlot.EnergySlot[];
	enemyBoardVisible: boolean;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

let _playerBoardState: BoardState | null = null;
let _inputEnabled = true;

export function createBoardState(): BoardState {
	return {
		slotShaders: [],
		dropZones: [],
		cpuSlotShaders: [],
		enemyBoardVisible: false,
		x: constants.PLAYER_BOARD_X,
		y: constants.PLAYER_BOARD_Y,
		width: constants.TILE_WIDTH * 3 + 8 * 2,
		height: constants.TILE_HEIGHT * 3 + 8 * 2,
	};
}

export function renderBoardSlots(board: BoardState) {
	destroyVisuals(board);

	const slotSpacing = 8;
	board.slotShaders = [];
	board.dropZones = [];
	board.cpuSlotShaders = [];

	const cells: Vec2[] = [];
	for (let tileY = 0; tileY < 3; tileY++)
		for (let tileX = 0; tileX < 3; tileX++) cells.push([tileX, tileY]);

	const boards = [
		{ x: constants.PLAYER_BOARD_X, y: constants.PLAYER_BOARD_Y, isPlayer: true },
		{ x: constants.CPU_BOARD_X, y: constants.CPU_BOARD_Y, isPlayer: false },
	];

	const elements = boards.map((boardInfo) =>
		cells.map(([cx, cy]) => renderCell([cx, cy], boardInfo, slotSpacing, board))
	);

	return elements.flat().flat();
}

function renderCell(
	[cx, cy]: Vec2,
	boardInfo: { x: number; y: number; isPlayer: boolean },
	slotSpacing: number,
	board: BoardState
) {
	let visualX = cx;
	if (!boardInfo.isPlayer) {
		visualX = 2 - cx;
	}

	const zoneX = boardInfo.x + visualX * (constants.TILE_WIDTH + slotSpacing);
	const zoneY = boardInfo.y + cy * (constants.TILE_HEIGHT + slotSpacing);

	const slotX = zoneX + constants.TILE_WIDTH / 2;
	const slotY = zoneY + constants.TILE_HEIGHT / 2;

	let energySlot: EnergySlot.EnergySlot;
	if (boardInfo.isPlayer) {
		energySlot = EnergySlot.EnergySlotFactory.createPlayerSlot(slotX, slotY, constants.TILE_WIDTH);
	} else {
		energySlot = EnergySlot.EnergySlotFactory.createEnemySlot(slotX, slotY, constants.TILE_WIDTH);
	}

	if (!boardInfo.isPlayer) {
		if (board.enemyBoardVisible) {
			energySlot.setPosition(slotX, slotY);
		} else {
			const offScreenX = constants.SCREEN_WIDTH + constants.TILE_WIDTH;
			energySlot.setPosition(offScreenX, slotY);
		}
		energySlot.setVisible(board.enemyBoardVisible);
		board.cpuSlotShaders.push(energySlot);
	} else {
		board.slotShaders.push(energySlot);
	}

	const createDropZone = () => {
		const dropZone = env.scene.add.zone(
			zoneX + constants.TILE_WIDTH / 2,
			zoneY + constants.TILE_HEIGHT / 2,
			constants.TILE_WIDTH,
			constants.TILE_HEIGHT
		);
		dropZone.setRectangleDropZone(constants.TILE_WIDTH, constants.TILE_HEIGHT);
		dropZone.setName("board-cell");
		dropZone.setData("cell-x", cx);
		dropZone.setData("cell-y", cy);
		board.dropZones.push(dropZone);

		return dropZone;
	};

	const dropzone = boardInfo.isPlayer ? createDropZone() : env.container();

	return [energySlot, dropzone];
}

export function setEnemyBoardVisible(visible: boolean): void {
	const board = getBoardState();
	board.enemyBoardVisible = visible;

	if (board.cpuSlotShaders.length > 0) {
		const slotSpacing = 8;

		if (visible) {
			board.cpuSlotShaders.forEach((slot, index) => {
				const cell = {
					x: index % 3,
					y: Math.floor(index / 3),
				};
				const visualX = 2 - cell.x;
				const targetX =
					constants.CPU_BOARD_X +
					visualX * (constants.TILE_WIDTH + slotSpacing) +
					constants.TILE_WIDTH / 2;
				const targetY = slot.getCurrentPosition().y;

				slot.setPosition(targetX, targetY);
				slot.setVisible(true);

				const graphics = slot.getGraphics();
				graphics.setScale(0);

				env.scene.tweens.killTweensOf(graphics);

				env.scene.tweens.add({
					targets: graphics,
					scale: 1,
					duration: 500,
					ease: "Back.easeOut",
				});
			});
		} else {
			board.cpuSlotShaders.forEach((slot) => {
				const graphics = slot.getGraphics();

				env.scene.tweens.killTweensOf(graphics);

				env.scene.tweens.add({
					targets: graphics,
					scale: 0,
					duration: 300,
					ease: "Power2.easeIn",
					onComplete: () => {
						slot.setVisible(false);
					},
				});
			});
		}
	}
}

export function display(board: BoardState): void {
	board.slotShaders.forEach((slot) => slot.setVisible(true));
	if (board.enemyBoardVisible) {
		board.cpuSlotShaders.forEach((slot) => slot.setVisible(true));
	}
}

/**
 * Show or hide the player board slot rings. Used by the awaken cinematic to
 * clear the board stage while the awakened unit takes the center slot.
 * Visibility (not alpha) is used on purpose — the slots run their own
 * oscillating alpha tween, so alpha tweens here would fight it.
 */
export function setPlayerSlotsVisible(visible: boolean): void {
	const board = getBoardState();
	board.slotShaders.forEach((slot) => slot.setVisible(visible));
}

export function destroyVisuals(board: BoardState): void {
	board.slotShaders.forEach((slot) => slot.destroy());
	board.slotShaders = [];
	board.cpuSlotShaders.forEach((slot) => slot.destroy());
	board.cpuSlotShaders = [];
	board.dropZones.forEach((zone) => zone.destroy());
	board.dropZones = [];
}

export function destroy(board: BoardState): void {
	destroyVisuals(board);
}

export function getEmptySlot(units: Unit[], forceId: string): Vec2 | null {
	const board = getBoardState();

	const boardWidthInTiles = Math.floor(board.width / constants.TILE_WIDTH);
	const boardHeightInTiles = Math.floor(board.height / constants.TILE_HEIGHT);

	const slot = BoardLogic.getEmptySlot(units, forceId, boardWidthInTiles, boardHeightInTiles);

	if (isSome(slot)) {
		return slot.value;
	} else {
		// Board full, no empty slot available
		return null;
	}
}

export function getTileAt(board: BoardState, pointer: { x: number; y: number }): Vec2 | null {
	const layout: Layout.BoardLayout = {
		x: board.x,
		y: board.y,
		tileWidth: constants.TILE_WIDTH,
		tileHeight: constants.TILE_HEIGHT,
		slotSpacing: 8,
		cols: 3,
		rows: 3,
	};

	return Layout.pointerToCell(layout, pointer);
}

export function getSlotPosition(slotIndex: number, isPlayerBoard: boolean = true): Vec2 {
	const layout: Layout.BoardLayout = {
		x: isPlayerBoard ? constants.PLAYER_BOARD_X : constants.CPU_BOARD_X,
		y: constants.PLAYER_BOARD_Y,
		tileWidth: constants.TILE_WIDTH,
		tileHeight: constants.TILE_HEIGHT,
		slotSpacing: 8,
		cols: 3,
		rows: 3,
	};

	const cell = Layout.slotIndexToCell(slotIndex);
	if (!cell) return [0, 0];

	return Layout.cellToSlotPosition(layout, cell, !isPlayerBoard);
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
	const oldPositionOfMovedUnit = structuredClone(unitToMove.position);

	const moveCheck = BoardLogic.checkMove(unitToMove, newBoardPosition, unitsOnBoard);

	if (!moveCheck.valid) {
		return null;
	}

	const occupierUnit = moveCheck.occupant;

	if (occupierUnit) {
		occupierUnit.position = oldPositionOfMovedUnit;
		unitToMove.position = newBoardPosition;
		return { movedUnit: unitToMove, swappedUnit: occupierUnit, oldPositionOfMovedUnit };
	} else {
		unitToMove.position = newBoardPosition;
		return { movedUnit: unitToMove, oldPositionOfMovedUnit };
	}
}

export function setIsInputEnabled(enabled: boolean) {
	_inputEnabled = enabled;
}

export function isInputEnabled() {
	return _inputEnabled;
}

export function create() {
	_playerBoardState = createBoardState();

	return renderBoardSlots(_playerBoardState!);
}

export function getBoardState(): BoardState {
	if (!_playerBoardState) {
		throw new Error("Board state not initialized");
	}
	return _playerBoardState;
}
