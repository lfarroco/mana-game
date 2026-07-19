import { Unit } from "./Models";
import * as geom from "./Geometry";

export function getEmptySlot(
	units: Unit[],
	forceId: string,
	width: number = 3,
	height: number = 3
): geom.Vec2 | null {
	const maxSlots = width * height;

	if (units.filter((u) => u.force === forceId).length >= maxSlots) {
		return null;
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const occupied = units
				.filter(u => u.force === forceId)
				.find(u => geom.eqVec2(u.position, [x, y]));

			if (!occupied) {
				return [x, y];
			}
		}
	}
	return null;
}

export function findFreeSlot(
	units: Unit[],
	forceId: string,
	preferredPos?: geom.Vec2
): geom.Vec2 | null {
	// If preference checks out
	if (preferredPos) {
		const occupied = units
			.filter(u => u.force === forceId)
			.find(u => geom.eqVec2(u.position, preferredPos));
		if (!occupied) return preferredPos;
	}
	return getEmptySlot(units, forceId);
}

export function checkMove(
	unit: Unit,
	newPos: geom.Vec2,
	units: Unit[]
): { valid: boolean; occupant?: Unit } {
	if (geom.eqVec2(unit.position, newPos)) {
		return { valid: false };
	}
	const occupant = units.find((u) => u.id !== unit.id && geom.eqVec2(u.position, newPos));
	return { valid: true, occupant };
}

export function createGrid(): number[][] {
	return [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
	]; // 3x3 Mock
}
