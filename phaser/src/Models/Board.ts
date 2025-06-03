import * as constants from "../Scenes/Battleground/constants";
import { pickOne, pickRandom } from "../utils";
import { vec2, sortBySnakeDistance, snakeDistanceBetween, Vec2 } from "./Geometry";
import { State, getActiveUnits, getUnitAt } from "./State";
import { Unit } from "./Unit";

export const PLAYER_BOARD_X = 900;
export const PLAYER_BOARD_Y = 200;

export const CPU_BOARD_X = 200;
export const CPU_BOARD_Y = 400;

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

	const enemies = getActiveUnits(state)
		.filter(u => u.force !== unit.force);

	// get all enemies in the same row, or neighoring row
	const closeUnits = enemies
		.filter(u => u.position.y >= unit.position.y - 1 && u.position.y <= unit.position.y + 1)
		.filter(u => !u.statuses["stealth"])
		.sort((a, b) => sortBySnakeDistance(unit.position)(a.position)(b.position))
		// keep 1 per row, as a far unit can be blocked by a closer unit
		.reduce((acc, u) => {
			if (acc.findIndex((a) => a.position.y === u.position.y) === -1) {
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

// receives a screen position and returns if it overlaps with the player board
// TODO: this can be replaced with a overlap check with the drop zone
export function overlapsWithPlayerBoard(pointer: Pointer) {
	const { x, y } = pointer;
	return (
		x >= PLAYER_BOARD_X &&
		x <= PLAYER_BOARD_X + constants.TILE_WIDTH * 3 &&
		y >= PLAYER_BOARD_Y &&
		y <= PLAYER_BOARD_Y + constants.TILE_HEIGHT * 3
	)
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

