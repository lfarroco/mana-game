import { Chara, createEmote, removeEmote } from "../../../Components/chara";
import { boardVec } from "../../../Models/Misc";
import { emit, events } from "../../../Models/Signals";
import { Squad } from "../../../Models/Squad";
import { BattlegroundScene } from "../BattlegroundScene";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../constants";

const TURNS_TO_MOVE = 3;
const moveSquads = (scene: BattlegroundScene) => {

	scene.state.squads
		.filter(s => !s.engaged)
		.filter(s => s.path.length > 0)
		.forEach(squad => {

			const chara = scene.charas.find(c => c.id === squad.id)
			if (!chara) return;
			const [next] = squad.path;

			const nextTile = scene.layers?.background.getTileAt(next.x, next.y);
			if (!nextTile) return;

			const direction = getDirection(next, squad.position)

			const maybeEnemy = scene.state.squads
				.filter(sqd =>
					sqd.force !== squad.force
					&& !sqd.isRetreating
					&& sqd.position.x === nextTile.x
					&& sqd.position.y === nextTile.y
				)

			if (maybeEnemy.length > 0) {

				emit(events.ENGAGEMENT_START, squad.id, boardVec(nextTile.x, nextTile.y))

				const getPosition = () => {
					switch (direction) {
						case "up":
							return { x: nextTile.x * TILE_WIDTH + HALF_TILE_WIDTH, y: (nextTile.y + 1) * TILE_HEIGHT }
						case "down":
							return { x: nextTile.x * TILE_WIDTH + HALF_TILE_WIDTH, y: (nextTile.y) * TILE_HEIGHT }
						case "left":
							return { x: (nextTile.x + 1) * TILE_WIDTH, y: (nextTile.y) * TILE_HEIGHT }
						case "right":
							return { x: (nextTile.x) * TILE_WIDTH, y: (nextTile.y) * TILE_HEIGHT }

					}
				}

				const pos = getPosition()
				// create sprite between cells
				const sprite = scene.add.sprite(
					pos.x,
					pos.y,
					"combat-emote"
				)
					.setScale(2)
					.play("combat-emote")


				squad.engaged = true;
				maybeEnemy.forEach(enemy => {
					enemy.engaged = true;
				})
				return;
			}

			const walked = chara.sprite.getData("walk") || 0

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

