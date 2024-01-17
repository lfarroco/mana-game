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

// TODO: invert params
export function getDirection(source: Vec2, target: Vec2): Direction {
	const dx = target.x - source.x;
	const dy = target.y - source.y;

	if (dx === 1) return DIRECTIONS.right;
	if (dx === -1) return DIRECTIONS.left;
	if (dy === 1) return DIRECTIONS.down;
	if (dy === -1) return DIRECTIONS.up;
	else throw new Error("invalid coordinates for direction");
}

// TODO: split facing from the arrow emote
export function faceDirection(direction: Direction, chara: Chara): Operation[] {

	if (direction === DIRECTIONS.right) {
		return [
			operations.CREATE_EMOTE(chara.id, "arrow-right-emote"),
			operations.FACE_DIRECTION(chara.id, "right")
		]
	} else if (direction === DIRECTIONS.left) {

		return [
			operations.CREATE_EMOTE(chara.id, "arrow-left-emote"),
			operations.FACE_DIRECTION(chara.id, "left")

		]

	} else if (direction === DIRECTIONS.down) {
		return [
			operations.CREATE_EMOTE(chara.id, "arrow-bottom-emote"),
			operations.FACE_DIRECTION(chara.id, "down")
		]
	} else if (direction === DIRECTIONS.up) {
		return [
			operations.CREATE_EMOTE(chara.id, "arrow-top-emote"),
			operations.FACE_DIRECTION(chara.id, "up")
		]
	}
	return []
}