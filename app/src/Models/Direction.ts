import { Chara, createEmote } from "../Components/chara";
import { BoardVec } from "./Misc";

export type Direction = "up" | "down" | "left" | "right";

// TODO: invert params
export function getDirection(nextTile: BoardVec, current: BoardVec): Direction {
	const dx = nextTile.x - current.x;
	const dy = nextTile.y - current.y;

	if (dx === 1) return "right";
	if (dx === -1) return "left";
	if (dy === 1) return "down";
	if (dy === -1) return "up";
	else throw new Error("invalid direction");
}

export function faceDirection(direction: Direction, chara: Chara) {

	if (direction === "right") {
		if (chara.sprite.anims.currentAnim?.key !== chara.job + "-walk-right") {

			createEmote(chara, "arrow-right-emote");
			chara.sprite.play(chara.job + "-walk-right", true);
		}
	} else if (direction === "left") {
		if (chara.sprite.anims.currentAnim?.key !== chara.job + "-walk-left") {

			createEmote(chara, "arrow-left-emote");
			chara.sprite.play(chara.job + "-walk-left", true);
		}
	} else if (direction === "down") {
		if (chara.sprite.anims.currentAnim?.key !== chara.job + "-walk-down") {
			createEmote(chara, "arrow-bottom-emote");
			chara.sprite.play(chara.job + "-walk-down", true);
		}
	} else if (direction === "up") {
		if (chara.sprite.anims.currentAnim?.key !== chara.job + "-walk-up") {
			createEmote(chara, "arrow-top-emote");
			chara.sprite.play(chara.job + "-walk-up", true);
		}
	}
}

