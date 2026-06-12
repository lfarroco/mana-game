import * as constants from "@Constants";
import * as Unit from "@Models/Entities/Unit";
import * as State from "@Models/State";
import * as EnergySlot from "Client/Components/EnergySlot/EnergySlot";
import * as BoardLogic from "@Models/BoardLogic";

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

export function renderBoardSlots(board: BoardState): void {

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

	boards.forEach((boardInfo) => {
		cells.forEach(([cx, cy]) => {
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
				energySlot = EnergySlot.EnergySlotFactory.createPlayerSlot(
					slotX,
					slotY,
					constants.TILE_WIDTH
				);
			} else {
				energySlot = EnergySlot.EnergySlotFactory.createEnemySlot(
					slotX,
					slotY,
					constants.TILE_WIDTH
				);
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

			if (boardInfo.isPlayer) {
				const dropZone = io.scene.add.zone(
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
			}
		});
	});
}

export function setEnemyBoardVisible(visible: boolean): void {
	const board = getBoardState();
	board.enemyBoardVisible = visible;

	if (board.cpuSlotShaders.length > 0) {
		const slotSpacing = 8;
		const offScreenX = constants.SCREEN_WIDTH + constants.TILE_WIDTH;

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

				slot.setVisible(true);
				slot.setPosition(offScreenX, slot.getCurrentPosition().y);

				io.scene.tweens.killTweensOf(slot.getShader());

				io.scene.tweens.add({
					targets: slot.getShader(),
					x: targetX,
					duration: 300,
					ease: "Power2.easeOut",
					delay: index * 50,
				});
			});
		} else {
			board.cpuSlotShaders.forEach((slot, index) => {

				io.scene.tweens.killTweensOf(slot.getShader());

				io.scene.tweens.add({
					targets: slot.getShader(),
					x: offScreenX,
					duration: 300,
					ease: "Power2.easeIn",
					delay: index * 30,
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

export function destroyVisuals(board: BoardState): void {
	board.slotShaders.forEach((slot) => slot.destroy());
	board.slotShaders = [];
	board.cpuSlotShaders.forEach((slot) => slot.destroy());
	board.cpuSlotShaders = [];
	board.dropZones.forEach((zone) => zone.destroy());
	board.dropZones = [];
}

export function update(time: number): void {
	if (!_playerBoardState) return;
	const board = getBoardState();
	board.slotShaders.forEach((slot) => slot.update(time));
	board.cpuSlotShaders.forEach((slot) => slot.update(time));
}

export function destroy(board: BoardState): void {
	destroyVisuals(board);
}

export function getEmptySlot(units: Unit.Unit[], forceId: string): Vec2 | null {
	const board = getBoardState();

	const boardWidthInTiles = Math.floor(board.width / constants.TILE_WIDTH);
	const boardHeightInTiles = Math.floor(board.height / constants.TILE_HEIGHT);

	const slot = BoardLogic.getEmptySlot(units, forceId, boardWidthInTiles, boardHeightInTiles);

	if (!slot) {
		// Board full, no empty slot available
	}
	return slot;
}

export function getTileAt(board: BoardState, pointer: { x: number; y: number }): Vec2 | null {
	const slotSpacing = 8;
	const tileWithSpacing = constants.TILE_WIDTH + slotSpacing;
	const heightWithSpacing = constants.TILE_HEIGHT + slotSpacing;

	if (
		pointer.x >= board.x &&
		pointer.x < board.x + board.width &&
		pointer.y >= board.y &&
		pointer.y < board.y + board.height
	) {
		const tileX = Math.floor((pointer.x - board.x) / tileWithSpacing);
		const tileY = Math.floor((pointer.y - board.y) / heightWithSpacing);

		if (tileX >= 0 && tileX < 3 && tileY >= 0 && tileY < 3) {
			return [tileX, tileY];
		}
	}
	return null;
}

export function getSlotPosition(slotIndex: number, isPlayerBoard: boolean = true): Vec2 {
	const slotSpacing = 8;
	const cells = [];
	for (let tileY = 0; tileY < 3; tileY++)
		for (let tileX = 0; tileX < 3; tileX++) cells.push([tileX, tileY]);

	const cell = cells[slotIndex];
	if (!cell) return [0, 0];

	const [cx, cy] = cell;

	let visualX = cx;
	if (!isPlayerBoard) {
		visualX = 2 - cx;
	}

	const boardX = isPlayerBoard ? constants.PLAYER_BOARD_X : constants.CPU_BOARD_X;
	const boardY = isPlayerBoard ? constants.PLAYER_BOARD_Y : constants.CPU_BOARD_Y;

	const zoneX = boardX + visualX * (constants.TILE_WIDTH + slotSpacing);
	const zoneY = boardY + cy * (constants.TILE_HEIGHT + slotSpacing);

	const slotX = zoneX + constants.TILE_WIDTH / 2;
	const slotY = zoneY + constants.TILE_HEIGHT / 2;

	return [slotX, slotY];
}

export function updateUnitPosition(
	unitToMove: Unit.Unit,
	newBoardPosition: Vec2,
	unitsOnBoard: Unit.Unit[]
): {
	movedUnit: Unit.Unit;
	swappedUnit?: Unit.Unit;
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
		if (state.battleData.units.length > 0) {
			// sync battledata
			const bdOccupier = state.battleData.units.find((u) => u.id === occupierUnit.id);
			if (bdOccupier) bdOccupier.position = oldPositionOfMovedUnit;

			const bdMoved = state.battleData.units.find((u) => u.id === unitToMove.id);
			if (bdMoved) bdMoved.position = newBoardPosition;
		}
		return { movedUnit: unitToMove, swappedUnit: occupierUnit, oldPositionOfMovedUnit };
	} else {
		unitToMove.position = newBoardPosition;
		if (state.battleData.units.length > 0) {
			//sync battledata
			const bdMoved = state.battleData.units.find((u) => u.id === unitToMove.id);
			if (bdMoved) bdMoved.position = newBoardPosition;
		}
		return { movedUnit: unitToMove, oldPositionOfMovedUnit };
	}
}

let _playerBoardState: BoardState | null = null;
let _inputEnabled = true;

export function setIsInputEnabled(enabled: boolean) {
	_inputEnabled = enabled;
}

export function isInputEnabled() {
	return _inputEnabled;
}

export function create() {
	_playerBoardState = createBoardState();
	//TODO: rendering inside a model, lol
	renderBoardSlots(_playerBoardState);
}

export function getBoardState(): BoardState {
	if (!_playerBoardState) {
		throw new Error("Board state not initialized");
	}
	return _playerBoardState;
}

export function getColumnNeighbors(state: State.State, unit: Unit.Unit) {
	return state.battleData.units
		.filter((u) => u.force === unit.force)
		.filter((u) => u.position[0] === unit.position[0] && u.id !== unit.id);
}

export function getRowNeighbors(state: State.State, unit: Unit.Unit) {
	return state.battleData.units
		.filter((u) => u.force === unit.force)
		.filter((u) => u.position[1] === unit.position[1] && u.id !== unit.id);
}

export function getNeighbors(state: State.State, unit: Unit.Unit) {
	return state.battleData.units
		.filter((u) => u.force === unit.force)
		.filter((u) => u.id !== unit.id)
		.filter((u) => u.position[0] >= unit.position[0] - 1 && u.position[0] <= unit.position[0] + 1)
		.filter((u) => u.position[1] >= unit.position[1] - 1 && u.position[1] <= unit.position[1] + 1);
}
