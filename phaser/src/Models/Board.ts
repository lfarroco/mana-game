import Phaser from "phaser";
import * as constants from "../constants/constants";
import { PLAYER_BOARD_X, PLAYER_BOARD_Y } from "../constants/constants";
import { vec2, Vec2, eqVec2, sortBySnakeDistance, snakeDistanceBetween } from "./Geometry";
import { Unit } from "./Entities/Unit"; // Pointer type might be implicitly from Phaser or a custom type
import { getActiveUnits, getUnitAt, State } from "./State";
import { pickOne, pickRandom } from "../utils";
import { playerForce } from "./Entities/Force"; // playerForce is used by getMeleeTarget, keep import
import { images } from "../assets";



export class PlayerBoard {
	scene: Phaser.Scene;
	slotImages: Phaser.GameObjects.Image[] = [];
	dropZones: Phaser.GameObjects.Zone[] = []; // Add drop zones array

	readonly x: number = PLAYER_BOARD_X;
	readonly y: number = PLAYER_BOARD_Y;
	readonly width: number = constants.TILE_WIDTH * 3;
	readonly height: number = constants.TILE_HEIGHT * 3;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	renderSlots(): void {
		this.destroyVisuals();

		this.slotImages = [];
		this.dropZones = [];
		for (let tileY = 0; tileY < 3; tileY++) {
			for (let tileX = 0; tileX < 3; tileX++) {
				const zoneX = this.x + tileX * constants.TILE_WIDTH;
				const zoneY = this.y + tileY * constants.TILE_HEIGHT;

				// Add slot image to each cell
				const slotImg = this.scene.add.image(
					zoneX + constants.TILE_WIDTH / 2,
					zoneY + constants.TILE_HEIGHT / 2,
					images.slot_round.key,
				);
				slotImg.setDisplaySize(constants.TILE_WIDTH, constants.TILE_HEIGHT);
				this.slotImages.push(slotImg);

				// Create an invisible drop zone over the slot image
				const dropZone = this.scene.add.zone(
					zoneX + constants.TILE_WIDTH / 2,
					zoneY + constants.TILE_HEIGHT / 2,
					constants.TILE_WIDTH,
					constants.TILE_HEIGHT
				);
				dropZone.setRectangleDropZone(constants.TILE_WIDTH, constants.TILE_HEIGHT);
				this.dropZones.push(dropZone);
			}
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
		// Check if the pointer is within the board's boundaries
		// Consistent with Phaser.Geom.Rectangle.contains (exclusive upper bound)
		if (pointer.x >= this.x && pointer.x < this.x + this.width &&
			pointer.y >= this.y && pointer.y < this.y + this.height) {

			return vec2(
				Math.floor((pointer.x - this.x) / constants.TILE_WIDTH),
				Math.floor((pointer.y - this.y) / constants.TILE_HEIGHT)
			);
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

// --- Module-level singleton management for a shared PlayerBoard ---
let _sharedPlayerBoardInstance: PlayerBoard | null = null;

/**
 * Initializes or re-initializes the shared PlayerBoard instance.
 * If an instance already exists, it's destroyed before a new one is created.
 * After initialization, call `playerBoard.createDropZone()` on the instance or
 * the module-level `createBoardDropZone()` to set up its visuals.
 * @param scene The Phaser scene.
 * @returns The newly created PlayerBoard instance.
 */
export function initializeSharedPlayerBoard(scene: Phaser.Scene): PlayerBoard {
	if (_sharedPlayerBoardInstance) {
		_sharedPlayerBoardInstance.destroy();
	}
	_sharedPlayerBoardInstance = new PlayerBoard(scene);
	return _sharedPlayerBoardInstance;
}

/**
 * Retrieves the shared PlayerBoard instance.
 * @returns The PlayerBoard instance, or null if it hasn't been initialized.
 */
export function getSharedPlayerBoard(): PlayerBoard | null {
	if (!_sharedPlayerBoardInstance) {
		console.warn("Shared PlayerBoard accessed before initialization. Call initializeSharedPlayerBoard(scene) first.");
	}
	return _sharedPlayerBoardInstance;
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


// --- Functions operating on the shared PlayerBoard instance ---
// These provide module-level access, similar to the previous API.


export function getUnitsByProximity(state: State, unit: Unit, enemy: boolean, range: number): Unit[] {
	return getActiveUnits(state)
		.filter(u => enemy ? u.force !== unit.force : u.force === unit.force)
		.filter(u => u.id !== unit.id)
		.sort((a, b) => sortBySnakeDistance(unit.position)(a.position)(b.position))
		.filter(u => snakeDistanceBetween(unit.position)(u.position) <= range);
}

export function getMeleeTarget(state: State, unit: Unit): Unit {

	const source = vec2(
		unit.position.x,
		unit.position.y + unit.force === playerForce.id ? 3 : -3,
	)

	const enemies = getActiveUnits(state)
		.filter(u => u.force !== unit.force);

	// get all enemies in the same column, or neighoring column
	const closeUnits = enemies
		.filter(u => u.position.x >= unit.position.x - 1 && u.position.x <= unit.position.x + 1)
		.sort((a, b) => sortBySnakeDistance(source)(a.position)(b.position))
		// keep 1 per row, as a far unit can be blocked by a closer unit
		.reduce((acc, u) => {
			if (acc.findIndex((a) => a.position.x === u.position.x) === -1) {
				acc.push(u);
			}
			return acc;
		}, [] as Unit[]);

	// any of them has the tratt "taunt"?
	const taunting = closeUnits
		.filter(u => u.traits.find(t => t.id === "taunt"));

	if (taunting.length > 0) {
		return pickOne(taunting);
	}

	if (closeUnits.length > 0) {
		return pickOne(closeUnits);
	}

	// pick random from remaining
	return pickOne(enemies);

}

export function getRangedTargets(state: State, unit: Unit, amount = 1): Unit[] {
	const enemies = getActiveUnits(state)
		.filter(u => u.force !== unit.force);

	// get all enemies in the same row, or neighoring row
	const closeUnits = enemies
		.filter(u => u.position.y >= unit.position.y - 1 && u.position.y <= unit.position.y + 1);

	// any of them has the trait "taunt"?
	const taunting = closeUnits
		.filter(u => u.traits.find(t => t.id === "taunt"));

	if (taunting.length > 0) {
		return pickRandom(taunting, amount);
	}

	if (closeUnits.length > 0) {
		return pickRandom(closeUnits, amount);
	}

	// pick random from remaining
	return pickRandom(enemies, amount);

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
