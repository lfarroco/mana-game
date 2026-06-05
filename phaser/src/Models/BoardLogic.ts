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
			const currentPos = Geometry.vec2(x, y);
			const occupied = units.find(
				(u) => u.force === forceId && u.position.x === x && u.position.y === y
			);
			// console.log(`[BoardLogic] Checking ${x},${y} -> ${occupied ? 'OCCUPIED' : 'FREE'}`);
			if (!occupied) {
				return currentPos;
			}
		}
	}
	return null;
}

export function findFreeSlot(
	units: Unit.Unit[],
	forceId: string,
	preferredPos?: Geometry.Vec2
): Geometry.Vec2 | null {
	// If preference checks out
	if (preferredPos) {
		const occupied = units.find(
			(u) =>
				u.force === forceId && u.position.x === preferredPos.x && u.position.y === preferredPos.y
		);
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
