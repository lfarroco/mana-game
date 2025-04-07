import { Vec2 } from "./Geometry";

export type Direction = "up" | "down" | "left" | "right";

export const DIRECTIONS: Record<Direction, Direction> = {
	up: "up",
	down: "down",
	left: "left",
	right: "right"
}

export function getDirection(source: Vec2, target: Vec2): Direction {
	const dx = target.x - source.x;
	const dy = target.y - source.y;

	// if dy is greater than dx, then we are moving vertically
	// likewise, if dx is greater than dy, then we are moving horizontally
	if (Math.abs(dx) > Math.abs(dy)) {
		if (dx >= 1) return DIRECTIONS.right;
		if (dx <= -1) return DIRECTIONS.left;
	} else {
		if (dy >= 1) return DIRECTIONS.down;
		if (dy <= -1) return DIRECTIONS.up;
	}

	throw new Error("trying to get direction from same point");
}

