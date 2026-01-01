import { Unit } from "./Entities/Unit";
import * as Geometry from "./SharedGeometry";

// Hardcoding these or moving to SharedConstants since we can't import full constants if they have phaser deps
// But constants usually safe. Let's use parameters or simple logic.
// Board size is fixed 3x3 for now.

export function getEmptySlot(units: Unit[], forceId: string, width: number = 3, height: number = 3): Geometry.Vec2 | null {
	const maxSlots = width * height;

	if (units.filter((u) => u.force === forceId).length >= maxSlots) {
		return null;
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const currentPos = Geometry.vec2(x, y);
			const occupied = units.find(u => u.force === forceId && u.position.x === x && u.position.y === y);
			// console.log(`[BoardLogic] Checking ${x},${y} -> ${occupied ? 'OCCUPIED' : 'FREE'}`);
			if (!occupied) {
				return currentPos;
			}
		}
	}
	return null;
}

export function findFreeSlot(units: Unit[], forceId: string, preferredPos?: Geometry.Vec2): Geometry.Vec2 | null {
	// If preference checks out
	if (preferredPos) {
		const occupied = units.find(u => u.force === forceId && u.position.x === preferredPos.x && u.position.y === preferredPos.y);
		if (!occupied) return preferredPos;
	}
	return getEmptySlot(units, forceId);
}

export function checkMove(unit: Unit, newPos: Geometry.Vec2, units: Unit[]): { valid: boolean, occupant?: Unit } {
	if (Geometry.eqVec2(unit.position, newPos)) {
		return { valid: false };
	}
	const occupant = units.find(u => u.id !== unit.id && Geometry.eqVec2(u.position, newPos));
	return { valid: true, occupant };
}
