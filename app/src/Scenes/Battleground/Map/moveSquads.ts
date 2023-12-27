import { removeEmote } from "../../../Components/chara";
import { boardVec, toBoardVec } from "../../../Models/Misc";
import { emit, events } from "../../../Models/Signals";
import { BattlegroundScene } from "../BattlegroundScene";
import { DIRECTIONS, getDirection } from "../../../Models/Direction";
import { faceDirection } from "../../../Models/Direction";
import { SQUAD_STATUS } from "../../../Models/Squad";

const TURNS_TO_MOVE = 3;
const moveSquads = (scene: BattlegroundScene) => {

	scene.state.squads
		.filter(s => s.status === SQUAD_STATUS.IDLE || s.status === SQUAD_STATUS.MOVING || s.status === SQUAD_STATUS.RETREATING)
		.filter(s => s.path.length > 0)
		.forEach(squad => {

			const chara = scene.charas.find(c => c.id === squad.id)
			if (!chara) return;
			const [next] = squad.path;

			const nextTile = scene.layers?.background.getTileAt(next.x, next.y);
			if (!nextTile) return;

			const direction = getDirection(toBoardVec(next), squad.position)

			const maybeEnemy = scene.state.squads
				.filter(sqd => sqd.force !== squad.force)
				.filter(sqd => sqd.status !== SQUAD_STATUS.RETREATING)
				.filter(sqd =>
					sqd.position.x === nextTile.x
					&& sqd.position.y === nextTile.y
				)

			if (maybeEnemy.length > 0) {

				emit(events.ENGAGEMENT_START, squad.id, boardVec(nextTile.x, nextTile.y))

				squad.status = SQUAD_STATUS.ENGAGED
				maybeEnemy.forEach(enemy => {
					enemy.status = SQUAD_STATUS.ENGAGED
				})
				return;
			}

			const walked = chara.sprite.getData("walk") || 0

			chara.sprite.setData("walk", walked + 1);
			if (chara.emote) {
				chara.emote.setVisible(true)
			}
			if (chara.emoteOverlay) {
				chara.emoteOverlay.setVisible(true)
			}
			// reveal the emote as the walked count progresses
			// acoording to position
			if (direction === DIRECTIONS.right) {
				chara.emoteOverlay?.setCrop(0, 0, 32 * (walked / TURNS_TO_MOVE), 32)
			} else if (direction === DIRECTIONS.left) {
				console.log(walked, TURNS_TO_MOVE)
				chara.emoteOverlay?.setCrop(32 * (1 - (walked / TURNS_TO_MOVE)), 0, 32, 32)
			} else if (direction === DIRECTIONS.down) {
				chara.emoteOverlay?.setCrop(0, 0, 32, 32 * (walked / TURNS_TO_MOVE))
			} else if (direction === DIRECTIONS.up) {
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

						if (nextDirection !== direction)
							faceDirection(nextDirection, chara);

					} else {
						removeEmote(chara)
					}
				}
			})

			squad.path.shift();

			squad.position.x = nextTile.x
			squad.position.y = nextTile.y

			chara.direction = direction

			if (squad.status === SQUAD_STATUS.MOVING || squad.status === SQUAD_STATUS.RETREATING)
				squad.status = SQUAD_STATUS.IDLE

			chara.sprite.setData("walk", 0)

		});
}

export default moveSquads


