import Phaser from "phaser";
import * as constants from "../constants/constants";
import { PLAYER_BOARD_X, PLAYER_BOARD_Y, CPU_BOARD_X, CPU_BOARD_Y } from "../constants/constants";
import { vec2, Vec2, eqVec2 } from "./Geometry";
import { Unit } from "./Entities/Unit";
import { getUnitAt, State } from "./State";
import { EnergySlot, EnergySlotFactory } from "../components/EnergySlot/EnergySlot";

export class PartyBoard {
	scene: Phaser.Scene;
	slotShaders: EnergySlot[] = [];
	dropZones: Phaser.GameObjects.Zone[] = [];
	cpuSlotShaders: EnergySlot[] = [];

	enemyBoardVisible: boolean = false;

	readonly x: number = PLAYER_BOARD_X;
	readonly y: number = PLAYER_BOARD_Y;
	readonly width: number = constants.TILE_WIDTH * 3 + 8 * 2;
	readonly height: number = constants.TILE_HEIGHT * 3 + 8 * 2;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	renderSlots(): void {
		this.destroyVisuals();

		const slotSpacing = 8;
		this.slotShaders = [];
		this.dropZones = [];
		this.cpuSlotShaders = [];

		let cells = []
		for (let tileY = 0; tileY < 3; tileY++)
			for (let tileX = 0; tileX < 3; tileX++)
				cells.push(vec2(tileX, tileY));

		const boards = [
			{ x: PLAYER_BOARD_X, y: PLAYER_BOARD_Y, isPlayer: true },
			{ x: CPU_BOARD_X, y: CPU_BOARD_Y, isPlayer: false }
		];

		boards.forEach(board => {
			cells.forEach((cell) => {
				let visualX = cell.x;
				if (!board.isPlayer) {
					visualX = 2 - cell.x;
				}

				const zoneX = board.x + visualX * (constants.TILE_WIDTH + slotSpacing);
				const zoneY = board.y + cell.y * (constants.TILE_HEIGHT + slotSpacing);

				const slotX = zoneX + constants.TILE_WIDTH / 2;
				const slotY = zoneY + constants.TILE_HEIGHT / 2;

				let energySlot: EnergySlot;
				if (board.isPlayer) {
					energySlot = EnergySlotFactory.createPlayerSlot(this.scene, slotX, slotY, constants.TILE_WIDTH);
				} else {
					energySlot = EnergySlotFactory.createEnemySlot(this.scene, slotX, slotY, constants.TILE_WIDTH);
				}

				if (!board.isPlayer) {
					if (this.enemyBoardVisible) {
						energySlot.setPosition(slotX, slotY);
					} else {
						const offScreenX = constants.SCREEN_WIDTH + constants.TILE_WIDTH;
						energySlot.setPosition(offScreenX, slotY);
					}
					energySlot.setVisible(this.enemyBoardVisible);
					this.cpuSlotShaders.push(energySlot);
				} else {
					this.slotShaders.push(energySlot);
				}

				if (board.isPlayer) {
					const dropZone = this.scene.add.zone(
						zoneX + constants.TILE_WIDTH / 2,
						zoneY + constants.TILE_HEIGHT / 2,
						constants.TILE_WIDTH,
						constants.TILE_HEIGHT
					);
					dropZone.setRectangleDropZone(constants.TILE_WIDTH, constants.TILE_HEIGHT);
					this.dropZones.push(dropZone);
				}

			})
		});
	}

	setEnemyBoardVisible(visible: boolean): void {
		this.enemyBoardVisible = visible;

		if (this.cpuSlotShaders.length > 0) {
			const slotSpacing = 8;
			const offScreenX = constants.SCREEN_WIDTH + constants.TILE_WIDTH;

			if (visible) {
				this.cpuSlotShaders.forEach((slot, index) => {
					const cell = {
						x: index % 3,
						y: Math.floor(index / 3)
					};
					const visualX = 2 - cell.x;
					const targetX = CPU_BOARD_X + visualX * (constants.TILE_WIDTH + slotSpacing) + constants.TILE_WIDTH / 2;

					slot.setVisible(true);
					slot.setPosition(offScreenX, slot.getCurrentPosition().y);

					this.scene.tweens.killTweensOf(slot.getShader());

					this.scene.tweens.add({
						targets: slot.getShader(),
						x: targetX,
						duration: 300,
						ease: 'Power2.easeOut',
						delay: index * 50
					});
				});
			} else {
				this.cpuSlotShaders.forEach((slot, index) => {
					this.scene.tweens.killTweensOf(slot.getShader());

					this.scene.tweens.add({
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

	display(): void {
		this.slotShaders.forEach(slot => slot.setVisible(true));
		if (this.enemyBoardVisible) {
			this.cpuSlotShaders.forEach(slot => slot.setVisible(true));
		}
	}

	destroyVisuals(): void {
		this.slotShaders.forEach(slot => slot.destroy());
		this.slotShaders = [];
		this.cpuSlotShaders.forEach(slot => slot.destroy());
		this.cpuSlotShaders = [];
		this.dropZones.forEach(zone => zone.destroy());
		this.dropZones = [];
	}

	update(time: number): void {
		this.slotShaders.forEach(slot => slot.update(time));
		this.cpuSlotShaders.forEach(slot => slot.update(time));
	}

	destroy(): void {
		this.destroyVisuals();
	}

	getEmptySlot(units: Unit[], forceId: string): Vec2 | null {
		const boardWidthInTiles = Math.floor(this.width / constants.TILE_WIDTH);
		const boardHeightInTiles = Math.floor(this.height / constants.TILE_HEIGHT);
		const maxSlots = boardWidthInTiles * boardHeightInTiles;

		if (units.filter(u => u.force === forceId).length >= maxSlots) {
			console.warn("Board full. No empty slot available for forceId:", forceId);
			return null;
		}

		for (let y = 0; y < boardHeightInTiles; y++) {
			for (let x = 0; x < boardWidthInTiles; x++) {
				const currentPos = vec2(x, y);
				if (!getUnitAt(units)(currentPos)) {
					return currentPos;
				}
			}
		}
		return null;
	}

	getTileAt(pointer: { x: number; y: number }): Vec2 | null {
		const slotSpacing = 8;
		const tileWithSpacing = constants.TILE_WIDTH + slotSpacing;
		const heightWithSpacing = constants.TILE_HEIGHT + slotSpacing;

		if (pointer.x >= this.x && pointer.x < this.x + this.width &&
			pointer.y >= this.y && pointer.y < this.y + this.height) {

			const tileX = Math.floor((pointer.x - this.x) / tileWithSpacing);
			const tileY = Math.floor((pointer.y - this.y) / heightWithSpacing);

			if (tileX >= 0 && tileX < 3 && tileY >= 0 && tileY < 3) {
				return vec2(tileX, tileY);
			}
		}
		return null;
	}

	static updateUnitPosition(
		unitToMove: Unit,
		newBoardPosition: Vec2,
		unitsOnBoard: Unit[]
	): {
		movedUnit: Unit;
		swappedUnit?: Unit;
		oldPositionOfMovedUnit: Vec2;
	} | null {
		const oldPositionOfMovedUnit = { ...unitToMove.position };

		if (eqVec2(oldPositionOfMovedUnit, newBoardPosition)) {
			return null;
		}

		const occupierUnit = unitsOnBoard.find(u => u.id !== unitToMove.id && eqVec2(u.position, newBoardPosition));

		if (occupierUnit) {
			occupierUnit.position = oldPositionOfMovedUnit;
			unitToMove.position = newBoardPosition;
			return { movedUnit: unitToMove, swappedUnit: occupierUnit, oldPositionOfMovedUnit };
		} else {
			unitToMove.position = newBoardPosition;
			return { movedUnit: unitToMove, oldPositionOfMovedUnit };
		}
	}


}

let _playerBoardInstance: PartyBoard | null = null;

export function initializePlayerBoard(scene: Phaser.Scene): PartyBoard {
	if (_playerBoardInstance) {
		_playerBoardInstance.destroy();
	}
	_playerBoardInstance = new PartyBoard(scene);
	return _playerBoardInstance;
}

export function getSharedPlayerBoard(): PartyBoard {
	if (!_playerBoardInstance) {
		throw new Error("Shared PlayerBoard accessed before initialization. Call initializeSharedPlayerBoard(scene) first.");
	}
	return _playerBoardInstance;
}

export function createBoardDropZone(): void {
	const board = getSharedPlayerBoard();
	board.renderSlots();
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
