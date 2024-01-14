import { Chara, createEmote } from "../Components/Chara";
import { Vec2 } from "./Geometry";

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

export function faceDirection(direction: Direction, chara: Chara) {

	if (direction === DIRECTIONS.right) {
		createEmote(chara, "arrow-right-emote");
		chara.sprite.play(chara.job + "-walk-right", true);
	} else if (direction === DIRECTIONS.left) {

		createEmote(chara, "arrow-left-emote");
		chara.sprite.play(chara.job + "-walk-left", true);
	} else if (direction === DIRECTIONS.down) {
		createEmote(chara, "arrow-bottom-emote");
		chara.sprite.play(chara.job + "-walk-down", true);
	} else if (direction === DIRECTIONS.up) {
		createEmote(chara, "arrow-top-emote");
		chara.sprite.play(chara.job + "-walk-up", true);
	}
}

