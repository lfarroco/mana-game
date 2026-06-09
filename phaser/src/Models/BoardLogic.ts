import * as Unit from "@Models/Entities/Unit";
import * as Geometry from "@Models/Geometry";

export function getEmptySlot(
	units: Unit.Unit[],
	forceId: string,
	width: number = 3,
	height: number = 3
): Vec2 | null {
	const maxSlots = width * height;

	if (units.filter((u) => u.force === forceId).length >= maxSlots) {
		return null;
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const occupied = units
				.filter(u => u.force === forceId)
				.find(u => Geometry.eqVec2(u.position, [x, y]));

			if (!occupied) {
				return [x, y];
			}
		}
	}
	return null;
}

export function findFreeSlot(
	units: Unit.Unit[],
	forceId: string,
	preferredPos?: Vec2
): Geometry.Vec2 | null {
	// If preference checks out
	if (preferredPos) {
		const occupied = units
			.filter(u => u.force === forceId)
			.find(u => Geometry.eqVec2(u.position, preferredPos));
		if (!occupied) return preferredPos;
	}
	return getEmptySlot(units, forceId);
}

export function checkMove(
	unit: Unit.Unit,
	newPos: Geometry.Vec2,
	units: Unit.Unit[]
): { valid: boolean; occupant?: Unit.Unit } {
	if (Geometry.eqVec2(unit.position, newPos)) {
		return { valid: false };
	}
	const occupant = units.find((u) => u.id !== unit.id && Geometry.eqVec2(u.position, newPos));
	return { valid: true, occupant };
}

export function createGrid(): number[][] {
	return [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
	]; // 3x3 Mock
}
