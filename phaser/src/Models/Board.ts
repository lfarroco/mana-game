import { FORCE_ID_PLAYER, TILE_HEIGHT, TILE_WIDTH } from "../Scenes/Battleground/constants";
import { pickOne, pickRandom } from "../utils";
import { vec2, sortBySnakeDistance, snakeDistanceBetween } from "./Geometry";
import { State, getActiveUnits, getUnitAt } from "./State";
import { Unit } from "./Unit";
import * as A from 'fp-ts/lib/Array';
import { pipe } from 'fp-ts/lib/function';

export const cells = pipe(
	A.range(1, 3),
	A.flatMap(x =>
		pipe(
			A.range(1, 3),
			A.map(y => ({ x, y }))
		)
	)
);

const START_X = 1;
const START_Y = 1;

export function getEmptySlot(units: Unit[], forceId: string) {

	if (units.filter(u => u.force === forceId).length >= 9) {
		console.warn("Party full. No empty slot available for summoning");
		return null;
	}

	let startX = START_X;
	let endX = START_X + 3;
	const startY = START_Y;
	const endY = START_Y + 3;

	console.log("force :: ", FORCE_ID_PLAYER)

	if (forceId === FORCE_ID_PLAYER) {
		startX += 3;
		endX += 3;
	}

	// find an empty slot

	let isValid = false;
	let position = vec2(1, 1);

	while (!isValid) {
		for (let x = startX; x < endX; x++) {
			for (let y = startY; y < endY; y++) {
				if (!getUnitAt(units)(vec2(x, y))) {
					isValid = true;
					position = vec2(x, y);
					break;
				}
			}
			if (isValid) break;
		}
	}

	return position;
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
export function overlapsWithPlayerBoard({ x, y }: { x: number, y: number }) {
	return (
		x >= (1 + 3) * TILE_WIDTH &&
		x <= (1 + 3 + 3) * TILE_WIDTH &&
		y >= 1 * TILE_HEIGHT &&
		y <= (1 + 3) * TILE_HEIGHT
	)
}
