import Phaser from "phaser";
import * as constants from "../Scenes/Battleground/constants";
import { PLAYER_BOARD_X, PLAYER_BOARD_Y } from "../Scenes/Battleground/constants";
import { pickOne, pickRandom, } from "../utils";
import { playerForce } from "./Force";
import { vec2, sortBySnakeDistance, snakeDistanceBetween, Vec2, eqVec2 } from "./Geometry";
import { State, getActiveUnits, getUnitAt } from "./State";
import { Unit } from "./Unit"; // Pointer type might be implicitly from Phaser or a custom type

// Module-level state for board graphics
let _scene: Phaser.Scene | null = null;
let _tileDropZones: Phaser.GameObjects.Zone[] = [];
let _boardDropZoneDisplay: Phaser.GameObjects.Graphics | null = null;
let _boardDropZoneTween: Phaser.Tweens.Tween | null = null;

/** Prefix for naming player board tile GameObjects */
export const PLAYER_BOARD_TILE_ZONE_PREFIX = "player_board_tile_";

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

/**
 * Checks if a given screen position overlaps with the player board's drop zone.
 */
export function overlapsWithPlayerBoard(pointer: { x: number; y: number; }): boolean {
	return isPointerInBoardDropZone(pointer);
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
 * Updates the position of a unit on a given list of units (e.g., player's board).
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

// --- Board Drop Zone Management ---

/**
 * Initializes the board graphics system with a scene reference.
 * This must be called before creating or interacting with board-specific graphics.
 * @param scene The Phaser scene instance.
 */
export function initBoardGraphics(scene: Phaser.Scene): void {
	_scene = scene;
}

/**
 * Creates the main player board drop zone and its visual representation.
 * Requires `initBoardGraphics` to have been called.
 */
export function createBoardDropZone(): void {
	if (!_scene || _tileDropZones.length > 0) { // Prevent re-creation if already initialized
		console.error("Board graphics not initialized. Call initBoardGraphics(scene) first.");
		return;
	}
	// Destroy existing visuals if any, to prevent duplicates
	destroyBoardDropZoneVisuals();

	const x = PLAYER_BOARD_X;
	const y = PLAYER_BOARD_Y;
	const w = constants.TILE_WIDTH * 3;
	const h = constants.TILE_HEIGHT * 3;

	// Create individual tile zones
	_tileDropZones = [];
	for (let tileY = 0; tileY < 3; tileY++) {
		for (let tileX = 0; tileX < 3; tileX++) {
			const zoneX = x + tileX * constants.TILE_WIDTH;
			const zoneY = y + tileY * constants.TILE_HEIGHT;
			const tileZone = _scene.add.zone(zoneX, zoneY, constants.TILE_WIDTH, constants.TILE_HEIGHT)
				.setOrigin(0)
				.setName(`${PLAYER_BOARD_TILE_ZONE_PREFIX}${tileX}_${tileY}`)
				.setRectangleDropZone(constants.TILE_WIDTH, constants.TILE_HEIGHT);
			_tileDropZones.push(tileZone);
		}
	}

	// Create the visual display for the entire board area
	_boardDropZoneDisplay = _scene.add.graphics();
	_boardDropZoneDisplay.lineStyle(2, 0xffff00); // Yellow border
	_boardDropZoneDisplay.fillStyle(0x00ffff, 0.3); // Cyan fill with alpha
	_boardDropZoneDisplay.fillRect(x, y, w, h);
	_boardDropZoneDisplay.strokeRect(x, y, w, h);

	_boardDropZoneTween = _scene.tweens.add({
		targets: _boardDropZoneDisplay,
		alpha: 0.1,
		duration: 2000,
		repeat: -1,
		yoyo: true
	});
}

/**
 * Gets all individual tile drop zones.
 * @returns An array of Phaser.GameObjects.Zone for each tile.
 */
export function getTileDropZones(): Phaser.GameObjects.Zone[] {
	return _tileDropZones;
}

/**
* @deprecated The board now consists of multiple tile zones. Use getTileDropZones() or specific checks.
*/
export function getBoardDropZone(): Phaser.GameObjects.Zone | null {
	console.warn("getBoardDropZone() is deprecated. The board uses individual tile zones.");
	return null; // Or handle as appropriate if some legacy single-zone concept remains
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

export function displayBoardDropZone(): void {
	_boardDropZoneDisplay?.setVisible(true);
}

export function hideBoardDropZone(): void {
	_boardDropZoneDisplay?.setVisible(false);
}

export function destroyBoardDropZoneVisuals(): void {
	_boardDropZoneTween?.stop();
	_boardDropZoneTween = null;

	_boardDropZoneDisplay?.destroy();
	_boardDropZoneDisplay = null;

	_tileDropZones.forEach(zone => zone.destroy());
	_tileDropZones = [];
}

/** Call this when the scene shuts down to clean up board graphics resources. */
export function clearBoardGraphics(): void {
	destroyBoardDropZoneVisuals();
	_scene = null;
}
