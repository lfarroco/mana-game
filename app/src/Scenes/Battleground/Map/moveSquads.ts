import { removeEmote } from "../../../Components/chara";
import { boardVec, asBoardVec, isSameBoardVec } from "../../../Models/Misc";
import { emit, events } from "../../../Models/Signals";
import { BattlegroundScene } from "../BattlegroundScene";
import { DIRECTIONS, getDirection } from "../../../Models/Direction";
import { faceDirection } from "../../../Models/Direction";
import { SQUAD_STATUS } from "../../../Models/Squad";

const TURNS_TO_MOVE = 3;
const moveSquads = (scene: BattlegroundScene) => {

	scene.state.squads
		.filter(s => s.status === SQUAD_STATUS.MOVING || s.status === SQUAD_STATUS.RETREATING)
		.filter(s => s.path.length > 0)
		.forEach(squad => {

			const chara = scene.charas.find(c => c.id === squad.id)
			if (!chara) return;
			const [next] = squad.path;

			const nextTile = scene.layers?.background.getTileAt(next.x, next.y);
			if (!nextTile) return;

			const direction = getDirection(asBoardVec(next), squad.position)

			faceDirection(direction, chara);

			const maybeEnemy = scene.state.squads
				.filter(sqd => sqd.force !== squad.force)
				.filter(sqd => sqd.status !== SQUAD_STATUS.RETREATING)
				.filter(sqd => isSameBoardVec(sqd.position, asBoardVec(nextTile)))

			if (maybeEnemy.length > 0) {

				emit(events.ENGAGEMENT_START, squad.id, boardVec(nextTile.x, nextTile.y))

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
				chara.emoteOverlay?.setCrop(32 * (1 - (walked / TURNS_TO_MOVE)), 0, 32, 32)
			} else if (direction === DIRECTIONS.down) {
				chara.emoteOverlay?.setCrop(0, 0, 32, 32 * (walked / TURNS_TO_MOVE))
			} else if (direction === DIRECTIONS.up) {
				chara.emoteOverlay?.setCrop(0, 32 * (1 - (walked / TURNS_TO_MOVE)), 32, 32)
			}

			if (walked < TURNS_TO_MOVE) return

			// perform the move

			// check if there's a city here
			const maybeCity = scene.state.cities.find(c => c.boardPosition.x === nextTile.x && c.boardPosition.y === nextTile.y)

			if (maybeCity && maybeCity.force !== squad.force) {
				emit(events.CAPTURE_CITY, maybeCity.id, squad.force)
			}

			scene.tweens.add({
				targets: chara.sprite,
				x: nextTile.getCenterX(),
				y: nextTile.getCenterY(),
				duration: 500 / scene.state.speed, // TODO: divide by constant for tick
				yoyo: false,
				ease: "Sine.easeInOut",
				onComplete: () => {
					// only non impactful actions can be performed here
					// as the callback can mess up with the turn system

					const next = squad.path[0];
					if (next) {

						const nextDirection = getDirection(asBoardVec(next), squad.position)

						faceDirection(nextDirection, chara);

					} else {
						removeEmote(chara)
					}
				}
			})

			emit(events.SQUAD_LEAVES_CELL, squad.id, squad.position)

			const [, ...path] = squad.path
			emit(events.UPDATE_SQUAD, squad.id, { path })
			emit(events.UPDATE_SQUAD, squad.id, { position: asBoardVec(nextTile) })
			emit(events.SQUAD_MOVED_INTO_CELL, squad.id, asBoardVec(nextTile))

			chara.direction = direction

			chara.sprite.setData("walk", 0)

			if (path.length === 0) {
				if (squad.status === SQUAD_STATUS.MOVING || squad.status === SQUAD_STATUS.RETREATING) {
					emit(events.UPDATE_SQUAD, squad.id, {
						status: SQUAD_STATUS.IDLE
					})
				}
			}

		});
}

export default moveSquads


