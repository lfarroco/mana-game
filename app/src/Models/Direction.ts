import { Chara } from "../Components/MapChara";
import { Vec2 } from "./Geometry";
import { emit } from "./Signals";

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
export function faceDirection(direction: Direction, chara: Chara) {

	if (direction === DIRECTIONS.right) {
		emit("CREATE_EMOTE", chara.id, "arrow-right-emote");
		chara.sprite.play(chara.job + "-walk-right", true);
	} else if (direction === DIRECTIONS.left) {
		emit("CREATE_EMOTE", chara.id, "arrow-left-emote");
		chara.sprite.play(chara.job + "-walk-left", true);
	} else if (direction === DIRECTIONS.down) {
		emit("CREATE_EMOTE", chara.id, "arrow-bottom-emote")
		chara.sprite.play(chara.job + "-walk-down", true);
	} else if (direction === DIRECTIONS.up) {
		emit("CREATE_EMOTE", chara.id, "arrow-top-emote")
		chara.sprite.play(chara.job + "-walk-up", true);
	}
}