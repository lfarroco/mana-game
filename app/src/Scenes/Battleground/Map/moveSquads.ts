import { removeEmote } from "../../../Components/chara";
import { boardVec, toBoardVec } from "../../../Models/Misc";
import { emit, events } from "../../../Models/Signals";
import { BattlegroundScene } from "../BattlegroundScene";
import { getDirection } from "../../../Models/Direction";
import { faceDirection } from "../../../Models/Direction";

const TURNS_TO_MOVE = 3;
const moveSquads = (scene: BattlegroundScene) => {

	scene.state.squads
		.filter(s => !s.engaged)
		.filter(s => s.path.length > 0)
		.forEach(squad => {

			console.log("will move", squad.id)

			const chara = scene.charas.find(c => c.id === squad.id)
			if (!chara) return;
			const [next] = squad.path;

			const nextTile = scene.layers?.background.getTileAt(next.x, next.y);
			if (!nextTile) return;

			const direction = getDirection(toBoardVec(next), squad.position)

			const maybeEnemy = scene.state.squads
				.filter(sqd =>
					sqd.force !== squad.force
					&& !sqd.isRetreating
					&& sqd.position.x === nextTile.x
					&& sqd.position.y === nextTile.y
				)

			if (maybeEnemy.length > 0) {

				emit(events.ENGAGEMENT_START, squad.id, boardVec(nextTile.x, nextTile.y))

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

						const nextDirection = getDirection(toBoardVec(next), squad.position)

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


