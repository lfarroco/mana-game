import { removeEmote } from "../../../Components/Chara";
import { vec2, asVec2, eqVec2 } from "../../../Models/Geometry";
import { emit, events } from "../../../Models/Signals";
import { BattlegroundScene } from "../BattlegroundScene";
import { DIRECTIONS, getDirection } from "../../../Models/Direction";
import { faceDirection } from "../../../Models/Direction";
import { SQUAD_STATUS, Squad } from "../../../Models/Squad";
import { TURN_DURATION } from "../../../config";

const TURNS_TO_MOVE = 3;
const moveSquads = (scene: BattlegroundScene) => {

	checkAgrooRange(scene);

	checkCombat(scene)

	scene.state.squads
		.filter(s => s.status === SQUAD_STATUS.MOVING)
		.filter(s => s.path.length > 0)
		.forEach(squad => {

			const chara = scene.charas.find(c => c.id === squad.id)
			if (!chara) return;
			const [next] = squad.path;

			const nextTile = scene.layers?.background.getTileAt(next.x, next.y);
			if (!nextTile) return;

			const direction = getDirection(squad.position, next)

			faceDirection(direction, chara);

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
				duration: TURN_DURATION / (2 * scene.state.speed),
				yoyo: false,
				ease: "Sine.easeInOut",
				onComplete: () => {
					// only non impactful actions can be performed here
					// as the callback can mess up with the turn system

					const next = squad.path[0];
					if (next && squad.path.length > 1) {

						const nextDirection = getDirection(squad.position, next)

						faceDirection(nextDirection, chara);

					} else {
						removeEmote(chara)
					}
				}
			})

			emit(events.SQUAD_LEAVES_CELL, squad.id, squad.position)

			const [, ...path] = squad.path
			emit(events.UPDATE_SQUAD, squad.id, { path })
			emit(events.UPDATE_SQUAD, squad.id, { position: asVec2(nextTile) })
			emit(events.SQUAD_MOVED_INTO_CELL, squad.id, asVec2(nextTile))

			chara.direction = direction

			chara.sprite.setData("walk", 0)

			const maybeEnemy = scene.state.squads
				.filter(sqd => sqd.force !== squad.force)
				.filter(sqd => eqVec2(sqd.position, asVec2(nextTile)))

			if (maybeEnemy.length > 0) {


				return;
			}

			if (path.length === 0) {
				if (squad.status === SQUAD_STATUS.MOVING) {
					emit(events.UPDATE_SQUAD, squad.id, {
						status: SQUAD_STATUS.IDLE
					})
				}
			}

		});
}

function checkAgrooRange(scene: BattlegroundScene) {
	scene.state.squads
		.filter(s => s.status === SQUAD_STATUS.MOVING)
		.filter(s => s.path.length > 0)
		.forEach(squad => {

			const enemiesNearby = getEnemiesNearby(scene, squad);

			if (enemiesNearby.length > 0) {
				emit(events.UPDATE_SQUAD, squad.id, {
					status: SQUAD_STATUS.ATTACKING
				});
			}
		});
}

function getEnemiesNearby(scene: BattlegroundScene, squad: Squad) {
	return scene.state.squads.filter(sqd => sqd.force !== squad.force).filter(
		sqd => eqVec2(sqd.position, vec2(
			squad.position.x + 1,
			squad.position.y
		)) ||
			eqVec2(sqd.position, vec2(
				squad.position.x - 1,
				squad.position.y
			)) ||
			eqVec2(sqd.position, vec2(
				squad.position.x,
				squad.position.y + 1
			)) ||
			eqVec2(sqd.position, vec2(
				squad.position.x,
				squad.position.y - 1
			)
			));
}

function checkCombat(scene: BattlegroundScene) {
	scene.state.squads
		.filter(s => s.status === SQUAD_STATUS.ATTACKING)
		.filter(s => s.path.length > 0)
		.forEach(squad => {

			const enemiesNearby = getEnemiesNearby(scene, squad)

			if (enemiesNearby.length > 0) {

				const enemy = enemiesNearby[0]

				const chara = scene.charas.find(c => c.id === squad.id)
				if (!chara) return;

				const eChara = scene.charas.find(c => c.id === squad.id)
				if (!eChara) return;
				faceDirection(getDirection(squad.position, enemy.position), eChara)

				chara.emote?.setVisible(true)
				chara.emote?.setTint(0xff0000)
				attack(squad, enemy);
			} else if (squad.path.length === 0) {
				emit(events.UPDATE_SQUAD, squad.id, {
					status: SQUAD_STATUS.IDLE
				})
			} else {
				emit(events.UPDATE_SQUAD, squad.id, {
					status: SQUAD_STATUS.MOVING
				})
			}
		});
}

export default moveSquads


function attack(squad: Squad, enemy: Squad) {
	emit(events.ATTACK, squad.id, enemy.id);
	const newStamina = enemy.stamina - 9 < 0 ? 0 : enemy.stamina - 9;
	emit(events.UPDATE_SQUAD, enemy.id, { stamina: newStamina });
	if (newStamina === 0) {
		emit(events.SQUAD_DESTROYED, enemy.id);
	}
}

