import { Chara, createEmote, removeEmote } from "../../../Components/chara";
import { Squad } from "../../../Models/Squad";
import { BattlegroundScene } from "../BattlegroundScene";

const TURNS_TO_MOVE = 10;
const moveSquads = (scene: BattlegroundScene) => {

	scene.state.squads.forEach(squad => {
		if (squad.path.length < 1) return;

		const chara = scene.charas.find(c => c.id === squad.id)
		if (!chara) return;
		const [next] = squad.path;

		const nextTile = scene.layers?.background.getTileAt(next.x, next.y);
		if (!nextTile) return;

		const direction = getDirection(next, squad.position)
		const walked = chara.sprite.getData("walk") || 0

		console.log(walked)
		chara.sprite.setData("walk", walked + 1);
		// reveal the emote as the walked count progresses
		// acoording to position
		if (direction === "right") {
			chara.emoteOverlay?.setCrop(0, 0, 32 * (walked / TURNS_TO_MOVE), 32)
		} else if (direction === "left") {
			chara.emoteOverlay?.setCrop(32 * (1 - (walked / TURNS_TO_MOVE)), 0, 32, 32)
		} else if (direction === "down") {
			chara.emoteOverlay?.setCrop(0, 0, 32, 32 * (walked / TURNS_TO_MOVE))
		} else if (direction === "up") {
			chara.emoteOverlay?.setCrop(0, 32 * (1 - (walked / TURNS_TO_MOVE)), 32, 32)
		}

		if (walked < TURNS_TO_MOVE) return

		scene.tweens.add({
			targets: chara.sprite,
			x: nextTile.getCenterX(),
			y: nextTile.getCenterY(),
			duration: 500 / scene.state.speed, // TODO: divide by constant for tick
			yoyo: false,
			ease: "Sine.easeInOut",
			onComplete: () => {

				const next = squad.path[0];
				if (next) {

					const nextDirection = getDirection(next, squad.position)

					faceDirection(nextDirection, chara);

				} else {
					removeEmote(chara)
				}
			}
		})

		squad.path.shift();

		squad.position.x = nextTile.x
		squad.position.y = nextTile.y

		chara.sprite.setData("walk", 0)

	});
}

export default moveSquads

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

type Direction = "up" | "down" | "left" | "right"

export function getDirection(nextTile: { x: number; y: number; }, current: { x: number; y: number; }): Direction {
	const dx = nextTile.x - current.x;
	const dy = nextTile.y - current.y;

	if (dx === 1) return "right"
	if (dx === -1) return "left"
	if (dy === 1) return "down"
	if (dy === -1) return "up"
	else throw new Error("invalid direction")
}

