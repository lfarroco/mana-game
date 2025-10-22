import * as constants from "../constants/constants";
import * as constants_1 from "../constants/constants";
import * as Geometry from "./Geometry";
import { Unit } from "./Entities/Unit";
import { getState, getUnitAt, State } from "./State";
import * as EnergySlot from "../components/EnergySlot/EnergySlot";
import { scene } from "@Scenes/Battleground/BattlegroundScene";

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
		x: constants_1.PLAYER_BOARD_X,
		y: constants_1.PLAYER_BOARD_Y,
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

	let cells = []
	for (let tileY = 0; tileY < 3; tileY++)
		for (let tileX = 0; tileX < 3; tileX++)
			cells.push(Geometry.vec2(tileX, tileY));

	const boards = [
		{ x: constants_1.PLAYER_BOARD_X, y: constants_1.PLAYER_BOARD_Y, isPlayer: true },
		{ x: constants_1.CPU_BOARD_X, y: constants_1.CPU_BOARD_Y, isPlayer: false }
	];

	boards.forEach(boardInfo => {
		cells.forEach((cell) => {
			let visualX = cell.x;
			if (!boardInfo.isPlayer) {
				visualX = 2 - cell.x;
			}

			const zoneX = boardInfo.x + visualX * (constants.TILE_WIDTH + slotSpacing);
			const zoneY = boardInfo.y + cell.y * (constants.TILE_HEIGHT + slotSpacing);

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

			if (boardInfo.isPlayer) {
				const dropZone = scene.add.zone(
					zoneX + constants.TILE_WIDTH / 2,
					zoneY + constants.TILE_HEIGHT / 2,
					constants.TILE_WIDTH,
					constants.TILE_HEIGHT
				);
				dropZone.setRectangleDropZone(constants.TILE_WIDTH, constants.TILE_HEIGHT);
				dropZone.setName("board-cell")
				dropZone.setData("cell-x", cell.x);
				dropZone.setData("cell-y", cell.y);
				board.dropZones.push(dropZone);
			}

		})
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
					y: Math.floor(index / 3)
				};
				const visualX = 2 - cell.x;
				const targetX = constants_1.CPU_BOARD_X + visualX * (constants.TILE_WIDTH + slotSpacing) + constants.TILE_WIDTH / 2;

				slot.setVisible(true);
				slot.setPosition(offScreenX, slot.getCurrentPosition().y);

				scene.tweens.killTweensOf(slot.getShader());

				scene.tweens.add({
					targets: slot.getShader(),
					x: targetX,
					duration: 300,
					ease: 'Power2.easeOut',
					delay: index * 50
				});
			});
		} else {
			board.cpuSlotShaders.forEach((slot, index) => {
				scene.tweens.killTweensOf(slot.getShader());

				scene.tweens.add({
					targets: slot.getShader(),
					x: offScreenX,
					duration: 300,
					ease: 'Power2.easeIn',
					delay: index * 30,
					onComplete: () => {
						slot.setVisible(false);
					}
				});
			});
		}
	}
}

export function display(board: BoardState): void {
	board.slotShaders.forEach(slot => slot.setVisible(true));
	if (board.enemyBoardVisible) {
		board.cpuSlotShaders.forEach(slot => slot.setVisible(true));
	}
}

export function destroyVisuals(board: BoardState): void {
	board.slotShaders.forEach(slot => slot.destroy());
	board.slotShaders = [];
	board.cpuSlotShaders.forEach(slot => slot.destroy());
	board.cpuSlotShaders = [];
	board.dropZones.forEach(zone => zone.destroy());
	board.dropZones = [];
}

export function update(time: number): void {
	const board = getBoardState();
	board.slotShaders.forEach(slot => slot.update(time));
	board.cpuSlotShaders.forEach(slot => slot.update(time));
}

export function destroy(board: BoardState): void {
	destroyVisuals(board);
}

export function getEmptySlot(units: Unit[], forceId: string): Vec2 | null {
	const board = getBoardState();
	const boardWidthInTiles = Math.floor(board.width / constants.TILE_WIDTH);
	const boardHeightInTiles = Math.floor(board.height / constants.TILE_HEIGHT);
	const maxSlots = boardWidthInTiles * boardHeightInTiles;

	if (units.filter(u => u.force === forceId).length >= maxSlots) {
		console.warn("Board full. No empty slot available for forceId:", forceId);
		return null;
	}

	for (let y = 0; y < boardHeightInTiles; y++) {
		for (let x = 0; x < boardWidthInTiles; x++) {
			const currentPos = Geometry.vec2(x, y);
			if (!getUnitAt(units)(currentPos)) {
				return currentPos;
			}
		}
	}
	return null;
}

export function getTileAt(board: BoardState, pointer: { x: number; y: number }): Vec2 | null {
	const slotSpacing = 8;
	const tileWithSpacing = constants.TILE_WIDTH + slotSpacing;
	const heightWithSpacing = constants.TILE_HEIGHT + slotSpacing;

	if (pointer.x >= board.x && pointer.x < board.x + board.width &&
		pointer.y >= board.y && pointer.y < board.y + board.height) {

		const tileX = Math.floor((pointer.x - board.x) / tileWithSpacing);
		const tileY = Math.floor((pointer.y - board.y) / heightWithSpacing);

		if (tileX >= 0 && tileX < 3 && tileY >= 0 && tileY < 3) {
			return Geometry.vec2(tileX, tileY);
		}
	}
	return null;
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
	const state = getState();
	const oldPositionOfMovedUnit = { ...unitToMove.position };

	if (Geometry.eqVec2(oldPositionOfMovedUnit, newBoardPosition)) {
		return null;
	}

	const occupierUnit = unitsOnBoard.find(u => u.id !== unitToMove.id && Geometry.eqVec2(u.position, newBoardPosition));

	if (occupierUnit) {
		occupierUnit.position = oldPositionOfMovedUnit;
		unitToMove.position = newBoardPosition;
		if (state.battleData.units.length > 0) { // sync battledata
			state.battleData.units.find(u => u.id === occupierUnit.id)!.position = oldPositionOfMovedUnit;
			state.battleData.units.find(u => u.id === unitToMove.id)!.position = newBoardPosition;
		}
		return { movedUnit: unitToMove, swappedUnit: occupierUnit, oldPositionOfMovedUnit };
	} else {
		unitToMove.position = newBoardPosition;
		if (state.battleData.units.length > 0) { //sync battledata
			state.battleData.units.find(u => u.id === unitToMove.id)!.position = newBoardPosition;
		}
		return { movedUnit: unitToMove, oldPositionOfMovedUnit };
	}
}

let _playerBoardState: BoardState | null = null;

export function init() {
	if (_playerBoardState) {
		destroy(_playerBoardState);
	}
	_playerBoardState = createBoardState();
	renderBoardSlots(_playerBoardState)

}

export function getBoardState(): BoardState {
	if (!_playerBoardState) {
		throw new Error("Shared PlayerBoard accessed before initialization. Call Board.init() first.");
	}
	return _playerBoardState;
}

export function getColumnNeighbors(state: State, unit: Unit) {
	return state.battleData.units
		.filter(u => u.force === unit.force)
		.filter(u => u.position.x === unit.position.x && u.id !== unit.id);
}

export function getRowNeighbors(state: State, unit: Unit) {
	return state.battleData.units
		.filter(u => u.force === unit.force)
		.filter(u => u.position.y === unit.position.y && u.id !== unit.id);
}

export function getNeighbors(state: State, unit: Unit) {
	return state.battleData.units
		.filter(u => u.force === unit.force)
		.filter(u => u.id !== unit.id)
		.filter(u => u.position.x >= unit.position.x - 1 && u.position.x <= unit.position.x + 1)
		.filter(u => u.position.y >= unit.position.y - 1 && u.position.y <= unit.position.y + 1)
		;
}
