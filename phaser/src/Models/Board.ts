import Phaser from "phaser";
import * as constants from "../Scenes/Battleground/constants";
import { PLAYER_BOARD_X, PLAYER_BOARD_Y } from "../Scenes/Battleground/constants";
import { vec2, Vec2, eqVec2, sortBySnakeDistance, snakeDistanceBetween } from "./Geometry";
import { Unit } from "./Unit"; // Pointer type might be implicitly from Phaser or a custom type
import { getActiveUnits, getUnitAt, State } from "./State";
import { pickOne, pickRandom } from "../utils";
import { playerForce } from "./Force";

/** Prefix for naming player board tile GameObjects */
export const PLAYER_BOARD_TILE_ZONE_PREFIX = "player_board_tile_";

export class PlayerBoard {
	private scene: Phaser.Scene;
	private tileDropZones: Phaser.GameObjects.Zone[] = [];
	private boardDropZoneDisplay: Phaser.GameObjects.Graphics | null = null;
	private boardDropZoneTween: Phaser.Tweens.Tween | null = null;

	public readonly x: number = PLAYER_BOARD_X;
	public readonly y: number = PLAYER_BOARD_Y;
	public readonly width: number = constants.TILE_WIDTH * 3;
	public readonly height: number = constants.TILE_HEIGHT * 3;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	public createDropZone(): void {
		// Clean up any existing graphical elements this instance created
		this.destroyVisuals();

		this.tileDropZones = [];
		for (let tileY = 0; tileY < 3; tileY++) {
			for (let tileX = 0; tileX < 3; tileX++) {
				const zoneX = this.x + tileX * constants.TILE_WIDTH;
				const zoneY = this.y + tileY * constants.TILE_HEIGHT;
				const tileZone = this.scene.add.zone(zoneX, zoneY, constants.TILE_WIDTH, constants.TILE_HEIGHT)
					.setOrigin(0)
					.setName(`${PLAYER_BOARD_TILE_ZONE_PREFIX}${tileX}_${tileY}`)
					.setRectangleDropZone(constants.TILE_WIDTH, constants.TILE_HEIGHT);
				this.tileDropZones.push(tileZone);
			}
		}

		this.boardDropZoneDisplay = this.scene.add.graphics();
		this.boardDropZoneDisplay.lineStyle(2, 0xffff00); // Yellow border
		this.boardDropZoneDisplay.fillStyle(0x00ffff, 0.3); // Cyan fill with alpha
		this.boardDropZoneDisplay.fillRect(this.x, this.y, this.width, this.height);
		this.boardDropZoneDisplay.strokeRect(this.x, this.y, this.width, this.height);

		this.boardDropZoneTween = this.scene.tweens.add({
			targets: this.boardDropZoneDisplay,
			alpha: 0.1,
			duration: 2000,
			repeat: -1,
			yoyo: true
		});
	}

	public getTileDropZones(): Phaser.GameObjects.Zone[] {
		return this.tileDropZones;
	}

	public isPointerInDropZone(pointer: { x: number, y: number }): boolean {
		const boardBounds = new Phaser.Geom.Rectangle(this.x, this.y, this.width, this.height);
		return boardBounds.contains(pointer.x, pointer.y);
	}

	public display(): void {
		this.boardDropZoneDisplay?.setVisible(true);
	}

	public hide(): void {
		this.boardDropZoneDisplay?.setVisible(false);
	}

	/**
	 * Clears only the visual elements (graphics, tweens, zones) created by this board.
	 * The PlayerBoard instance itself remains, allowing visuals to be recreated later.
	 */
	public clearVisuals(): void {
		this.destroyVisuals();
	}

	private destroyVisuals(): void {
		this.boardDropZoneTween?.stop();
		this.boardDropZoneTween = null;

		this.boardDropZoneDisplay?.destroy();
		this.boardDropZoneDisplay = null;

		this.tileDropZones.forEach(zone => zone.destroy());
		this.tileDropZones = [];
	}

	/** Call this when the scene shuts down or the board is no longer needed. */
	public destroy(): void {
		this.destroyVisuals();
		// Any other cleanup specific to the PlayerBoard instance itself can go here
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
		board.createDropZone(); // This method internally handles cleanup of its previous visuals
	} else {
		console.error("Cannot create board drop zone: Shared PlayerBoard not initialized.");
	}
}

// --- End Module-level singleton management ---


// --- Functions operating on the shared PlayerBoard instance ---
// These provide module-level access, similar to the previous API.

// Looks for an empty slot in a 3x3 board
export function getEmptySlot(units: Unit[], forceId: string) {

	if (units.filter(u => u.force === forceId).length >= 9) {
		console.warn("Board full. No empty slot available");
		return null;
	}

	const startX = 0;
	const startY = 0;
	const endX = 2;
	const endY = 2;

	// find an empty slot

	for (let x = startX; x <= endX; x++) {
		for (let y = startY; y <= endY; y++) {
			if (!getUnitAt(units)(vec2(x, y))) {
				return vec2(x, y);
			}
		}
	}

	return null;
}


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
		.filter(u => !u.statuses["stealth"])
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

export function getTileAt({ x, y }: { x: number; y: number; }): Vec2 | null {

	const isInBounds = x >= PLAYER_BOARD_X
		&& x <= PLAYER_BOARD_X + constants.TILE_WIDTH * 3
		&& y >= PLAYER_BOARD_Y
		&& y <= PLAYER_BOARD_Y + constants.TILE_HEIGHT * 3;

	if (!isInBounds) return null

	return vec2(
		Math.floor((x - PLAYER_BOARD_X) / constants.TILE_WIDTH),
		Math.floor((y - PLAYER_BOARD_Y) / constants.TILE_HEIGHT)
	);

}

/**
 * Updates the position of a unit on a given list of units (e.g., player's board or any collection).
 * If the new position is occupied, it swaps the units.
 * This function modifies the unit objects directly.
 * @param unitToMove The unit that is being moved.
 * @param newBoardPosition The target {x, y} position on the board grid.
 * @param unitsOnBoard The array of units to check for collisions/swaps (e.g., state.gameData.player.units).
 * @returns An object detailing the move, including any swapped unit, or null if no move was made (e.g., dropped on the same spot).
 */
export function updateUnitPositionOnBoard(
	unitToMove: Unit,
	newBoardPosition: Vec2,
	unitsOnBoard: Unit[]
): {
	movedUnit: Unit; // This is unitToMove, returned for clarity
	swappedUnit?: Unit;
	oldPositionOfMovedUnit: Vec2;
} | null {
	const oldPositionOfMovedUnit = { ...unitToMove.position };

	if (eqVec2(oldPositionOfMovedUnit, newBoardPosition)) {
		return null; // No change in position
	}

	const occupierUnit = unitsOnBoard.find(u => u.id !== unitToMove.id && eqVec2(u.position, newBoardPosition));

	if (occupierUnit) {
		// Swap positions
		occupierUnit.position = oldPositionOfMovedUnit;
		unitToMove.position = newBoardPosition;
		return { movedUnit: unitToMove, swappedUnit: occupierUnit, oldPositionOfMovedUnit };
	} else {
		// Move to empty slot
		unitToMove.position = newBoardPosition;
		return { movedUnit: unitToMove, oldPositionOfMovedUnit };
	}
}

export function isPlayerBoardTileZone(gameObject: Phaser.GameObjects.GameObject): boolean {
	return gameObject && gameObject.name.startsWith(PLAYER_BOARD_TILE_ZONE_PREFIX);
}

export function getTileFromZone(zone: Phaser.GameObjects.GameObject): Vec2 | null {
	if (isPlayerBoardTileZone(zone)) {
		const parts = zone.name.substring(PLAYER_BOARD_TILE_ZONE_PREFIX.length).split('_');
		if (parts.length === 2) {
			const x = parseInt(parts[0], 10);
			const y = parseInt(parts[1], 10);
			if (!isNaN(x) && !isNaN(y)) {
				return vec2(x, y);
			}
		}
	}
	return null;
}
export function isPointerInBoardDropZone(pointer: { x: number, y: number }): boolean {
	const boardBounds = new Phaser.Geom.Rectangle(PLAYER_BOARD_X, PLAYER_BOARD_Y, constants.TILE_WIDTH * 3, constants.TILE_HEIGHT * 3);
	return boardBounds.contains(pointer.x, pointer.y);
}
