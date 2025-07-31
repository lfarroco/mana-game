import Phaser from "phaser";
import * as constants from "../constants/constants";
import { PLAYER_BOARD_X, PLAYER_BOARD_Y, CPU_BOARD_X, CPU_BOARD_Y } from "../constants/constants";
import { vec2, Vec2, eqVec2 } from "./Geometry";
import { Unit } from "./Entities/Unit"; // Pointer type might be implicitly from Phaser or a custom type
import { getUnitAt, State } from "./State";
import { images } from "../assets";

export class PartyBoard {
	scene: Phaser.Scene;
	slotImages: Phaser.GameObjects.Image[] = [];
	dropZones: Phaser.GameObjects.Zone[] = []; // Add drop zones array

	enemyBoardVisible: boolean = true;

	readonly x: number = PLAYER_BOARD_X;
	readonly y: number = PLAYER_BOARD_Y;
	readonly width: number = constants.TILE_WIDTH * 3 + 8 * 2; // Account for spacing between 3 tiles (2 gaps)
	readonly height: number = constants.TILE_HEIGHT * 3 + 8 * 2; // Account for spacing between 3 tiles (2 gaps)

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	renderSlots(): void {
		this.destroyVisuals();

		const slotSpacing = 8; // Add 8 pixels spacing between slots
		this.slotImages = [];
		this.dropZones = [];

		let cells = []
		for (let tileY = 0; tileY < 3; tileY++)
			for (let tileX = 0; tileX < 3; tileX++)
				cells.push(vec2(tileX, tileY));

		// Render slots for both player and CPU boards
		const boards = [
			{ x: PLAYER_BOARD_X, y: PLAYER_BOARD_Y, isPlayer: true },
			{ x: CPU_BOARD_X, y: CPU_BOARD_Y, isPlayer: false }
		];

		boards.forEach(board => {
			cells.forEach((cell) => {
				const zoneX = board.x + cell.x * (constants.TILE_WIDTH + slotSpacing);
				const zoneY = board.y + cell.y * (constants.TILE_HEIGHT + slotSpacing);

				// Add slot image to each cell
				const slotImg = this.scene.add.image(
					zoneX + constants.TILE_WIDTH / 2,
					zoneY + constants.TILE_HEIGHT / 2,
					images.slot_round.key,
				);
				slotImg.setDisplaySize(constants.TILE_WIDTH, constants.TILE_HEIGHT);
				// Set visibility for CPU slots based on flag
				if (!board.isPlayer) slotImg.setVisible(this.enemyBoardVisible);
				this.slotImages.push(slotImg);

				// Only create drop zones for player board (enemy units can't be dragged)
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
		// Update visibility of CPU slots if already rendered
		if (this.slotImages.length >= 18) {
			this.slotImages.slice(9, 18).forEach(img => img.setVisible(visible));
		}
	}

	display(): void {
		this.slotImages.forEach(img => img.setVisible(true));
	}

	destroyVisuals(): void {
		this.slotImages.forEach(img => img.destroy());
		this.slotImages = [];
		this.dropZones.forEach(zone => zone.destroy());
		this.dropZones = [];
	}

	/** Call this when the scene shuts down or the board is no longer needed. */
	destroy(): void {
		this.destroyVisuals();
		// Any other cleanup specific to the PlayerBoard instance itself can go here
	}

	/**
	 * Looks for an empty slot on the board.
	 * @param units The list of units currently on a board (e.g., player's guild units).
	 * @param forceId The forceId to check against for unit count (relevant if board has mixed forces, though typically used for one force).
	 * @returns A Vec2 position if an empty slot is found, otherwise null.
	 */
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
				// getUnitAt is a general utility function that finds a unit at a position in a given array.
				if (!getUnitAt(units)(currentPos)) {
					return currentPos;
				}
			}
		}
		return null;
	}

	/**
	 * Converts world coordinates to board tile coordinates.
	 * @param pointer An object with x, y world coordinates.
	 * @returns A Vec2 representing the tile coordinates (e.g., {x:0, y:0}), or null if outside board.
	 */
	getTileAt(pointer: { x: number; y: number }): Vec2 | null {
		const slotSpacing = 8; // Must match the spacing used in renderSlots()
		const tileWithSpacing = constants.TILE_WIDTH + slotSpacing;
		const heightWithSpacing = constants.TILE_HEIGHT + slotSpacing;

		// Check if the pointer is within the board's boundaries
		if (pointer.x >= this.x && pointer.x < this.x + this.width &&
			pointer.y >= this.y && pointer.y < this.y + this.height) {

			const tileX = Math.floor((pointer.x - this.x) / tileWithSpacing);
			const tileY = Math.floor((pointer.y - this.y) / heightWithSpacing);

			// Ensure we're within the 3x3 grid
			if (tileX >= 0 && tileX < 3 && tileY >= 0 && tileY < 3) {
				return vec2(tileX, tileY);
			}
		}
		return null;
	}

	/**
	 * Updates the position of a unit on a given list of units.
	 * If the new position is occupied, it swaps the units.
	 * This function modifies the unit objects directly.
	 * @param unitToMove The unit that is being moved.
	 * @param newBoardPosition The target {x, y} position on the board grid.
	 * @param unitsOnBoard The array of units to check for collisions/swaps.
	 * @returns An object detailing the move, or null if no move was made.
	 */
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
			return null; // No change in position
		}

		const occupierUnit = unitsOnBoard.find(u => u.id !== unitToMove.id && eqVec2(u.position, newBoardPosition));

		if (occupierUnit) {
			occupierUnit.position = oldPositionOfMovedUnit; // Swap
			unitToMove.position = newBoardPosition;
			return { movedUnit: unitToMove, swappedUnit: occupierUnit, oldPositionOfMovedUnit };
		} else {
			unitToMove.position = newBoardPosition; // Move to empty slot
			return { movedUnit: unitToMove, oldPositionOfMovedUnit };
		}
	}


}

let _playerBoardInstance: PartyBoard | null = null;

/**
 * Initializes or re-initializes the shared PlayerBoard instance.
 * If an instance already exists, it's destroyed before a new one is created.
 * After initialization, call `playerBoard.createDropZone()` on the instance or
 * the module-level `createBoardDropZone()` to set up its visuals.
 * @param scene The Phaser scene.
 * @returns The newly created PlayerBoard instance.
 */
export function initializePlayerBoard(scene: Phaser.Scene): PartyBoard {
	if (_playerBoardInstance) {
		_playerBoardInstance.destroy();
	}
	_playerBoardInstance = new PartyBoard(scene);
	return _playerBoardInstance;
}

/**
 * Retrieves the shared PlayerBoard instance.
 * @returns The PlayerBoard instance, or null if it hasn't been initialized.
 */
export function getSharedPlayerBoard(): PartyBoard | null {
	if (!_playerBoardInstance) {
		console.warn("Shared PlayerBoard accessed before initialization. Call initializeSharedPlayerBoard(scene) first.");
	}
	return _playerBoardInstance;
}

/**
 * Creates the drop zone visuals and interactive zones for the shared player board.
 * This will also clear any previous visuals on the shared board before creating new ones.
 * Requires `initializeSharedPlayerBoard` to have been called first.
 */
export function createBoardDropZone(): void {
	const board = getSharedPlayerBoard();
	if (board) {
		board.renderSlots(); // This method internally handles cleanup of its previous visuals
	} else {
		console.error("Cannot create board drop zone: Shared PlayerBoard not initialized.");
	}
}

// --- End Module-level singleton management ---



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
