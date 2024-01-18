import { Chara } from "../Components/MapChara";
import { Vec2 } from "./Geometry";
import { Operation, operations } from "./Signals";

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

	if (dx === 1) return DIRECTIONS.right;
	if (dx === -1) return DIRECTIONS.left;
	if (dy === 1) return DIRECTIONS.down;
	if (dy === -1) return DIRECTIONS.up;
	else throw new Error("invalid coordinates for direction");
}

