import { Unit } from "../Models";
import * as geom from "../math/Geometry";
import { Option, none, some } from "../Functional";

/**
 * Find an empty board slot for a given force by scanning row-major.
 * Uses a Set of occupied positions for O(1) membership lookup.
 */
export function getEmptySlot(
  units: Unit[],
  forceId: string,
  width: number = 3,
  height: number = 3,
): Option<geom.Vec2> {
  const maxSlots = width * height;

  if (units.filter((u) => u.force === forceId).length >= maxSlots) {
    return none;
  }

  const occupied = new Set(
    units
      .filter((u) => u.force === forceId)
      .map((u) => `${u.position[0]},${u.position[1]}`),
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!occupied.has(`${x},${y}`)) {
        return some([x, y]);
      }
    }
  }
  return none;
}

export function findFreeSlot(
  units: Unit[],
  forceId: string,
  preferredPos?: geom.Vec2,
): Option<geom.Vec2> {
  // If preference checks out
  if (preferredPos) {
    const occupied = units
      .filter((u) => u.force === forceId)
      .find((u) => geom.eqVec2(u.position, preferredPos));
    if (!occupied) return some(preferredPos);
  }
  return getEmptySlot(units, forceId);
}

export function checkMove(
  unit: Unit,
  newPos: geom.Vec2,
  units: Unit[],
): { valid: boolean; occupant?: Unit } {
  if (geom.eqVec2(unit.position, newPos)) {
    return { valid: false };
  }
  const occupant = units.find(
    (u) => u.id !== unit.id && geom.eqVec2(u.position, newPos),
  );
  return { valid: true, occupant };
}

/**
 * Create a board grid of the given dimensions.
 * Each cell is 0 (available); future iteration may support a mask
 * of locked/unlocked slots per row, e.g. createGrid(3, 3, [[0,1,0],[0,0,0],[0,0,0]]).
 */
export function createGrid(width: number = 3, height: number = 3): number[][] {
  return Array.from({ length: height }, () => Array(width).fill(0));
}
