import { createEmote, removeEmote } from "../../../Components/MapChara";
import { vec2, asVec2, eqVec2 } from "../../../Models/Geometry";
import { Operation, emit, sequence, events, operations } from "../../../Models/Signals";
import { BattlegroundScene } from "../BattlegroundScene";
import { DIRECTIONS, getDirection } from "../../../Models/Direction";
import { faceDirection } from "../../../Models/Direction";
import { SQUAD_STATUS, Squad } from "../../../Models/Squad";
import { TURN_DURATION } from "../../../config";
import { foldMap } from "../../../Models/Signals";

const TURNS_TO_MOVE = 3;
const moveSquads = (scene: BattlegroundScene) => {

	// apply user-defined status changes before starting (eg. moving)

	sequence(checkEnemiesInRange(scene))

	sequence(checkCombat(scene))

	sequence(moveStep(scene));

	checkDestroyed(scene);

	checkIdle(scene);

	updatePath(scene)

	cleanupEmotes(scene);

}

function moveStep(scene: BattlegroundScene): Operation[] {
	return foldMap(
		scene.state.squads.filter(s => s.status === SQUAD_STATUS.MOVING),
		squad => {

			const chara = scene.charas.find(c => c.id === squad.id);

			if (!chara) throw new Error("no chara found")

			const [next] = squad.path;

			const nextIsOccupied = scene.state.squads
				.filter(s => eqVec2(s.position, next))
				.length > 0;

			if (nextIsOccupied) {
				removeEmote(chara);

				return [operations.UPDATE_SQUAD(squad.id, {
					status: SQUAD_STATUS.ATTACKING
				})];
			}

			const nextTile = scene.layers?.background.getTileAt(next.x, next.y);

			if (!nextTile) throw new Error("no next tile found")

			const direction = getDirection(squad.position, next);

			const walked = chara.sprite.getData("walk") || 0;

			if (walked === 0) {
				faceDirection(direction, chara);
				chara.emote?.setVisible(true)
				chara.emoteOverlay?.setVisible(true)
			}

			chara.sprite.setData("walk", walked + 1);

			// reveal the emote as the walked count progresses
			// acoording to position
			if (direction === DIRECTIONS.right) {
				chara.emoteOverlay?.setCrop(0, 0, 32 * (walked / TURNS_TO_MOVE), 32);
			} else if (direction === DIRECTIONS.left) {
				chara.emoteOverlay?.setCrop(32 * (1 - (walked / TURNS_TO_MOVE)), 0, 32, 32);
			} else if (direction === DIRECTIONS.down) {
				chara.emoteOverlay?.setCrop(0, 0, 32, 32 * (walked / TURNS_TO_MOVE));
			} else if (direction === DIRECTIONS.up) {
				chara.emoteOverlay?.setCrop(0, 32 * (1 - (walked / TURNS_TO_MOVE)), 32, 32);
			}

			if (walked < TURNS_TO_MOVE) return [];

			// perform the move
			// check if there's a city here
			const maybeCity = scene.state.cities.find(c => c.boardPosition.x === nextTile.x && c.boardPosition.y === nextTile.y);

			if (maybeCity && maybeCity.force !== squad.force) {
				return [operations.CAPTURE_CITY(maybeCity.id, squad.force)];
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

						const nextDirection = getDirection(squad.position, next);

						faceDirection(nextDirection, chara);

					} else {
						removeEmote(chara);
					}
				}
			});

			const [, ...path] = squad.path;

			chara.sprite.setData("walk", 0);

			return [
				operations.SQUAD_LEAVES_CELL(squad.id, squad.position),
				operations.UPDATE_SQUAD(squad.id, { path }),
				operations.UPDATE_SQUAD(squad.id, { position: asVec2(nextTile) }),
				operations.SQUAD_MOVED_INTO_CELL(squad.id, asVec2(nextTile)),
			].concat(
				path.length === 0 ? [operations.UPDATE_SQUAD(squad.id, { status: SQUAD_STATUS.IDLE })] : []
			)
		})
}

function checkEnemiesInRange(scene: BattlegroundScene): Operation[] {
	return foldMap(
		scene.state.squads.filter(s => s.status === SQUAD_STATUS.IDLE),
		squad => {
			const enemiesNearby = getEnemiesNearby(scene, squad);

			if (enemiesNearby.length > 0) {
				return [operations.UPDATE_SQUAD(squad.id, {
					status: SQUAD_STATUS.ATTACKING
				})]
			} else {

				return [operations.UPDATE_SQUAD(squad.id, { status: SQUAD_STATUS.ATTACKING })]
			}
		})
}

function getEnemiesNearby(scene: BattlegroundScene, squad: Squad) {
	return scene.state.squads
		.filter(sqd => sqd.force !== squad.force)
		.filter(sqd => sqd.status !== SQUAD_STATUS.DESTROYED)
		.filter(
			sqd =>
				[
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1],
				].some(([x, y]) => eqVec2(sqd.position, vec2(
					squad.position.x + x,
					squad.position.y + y
				))))

}

function checkCombat(scene: BattlegroundScene) {

	return foldMap(
		scene.state.squads.filter(s => s.status === SQUAD_STATUS.ATTACKING),
		squad => {
			const enemiesNearby = getEnemiesNearby(scene, squad)

			if (enemiesNearby.length > 0) {

				const enemy = enemiesNearby[0]

				const chara = scene.charas.find(c => c.id === squad.id)
				if (!chara) return [];

				const enemyChara = scene.charas.find(c => c.id === squad.id)
				if (!enemyChara) return [];

				faceDirection(getDirection(squad.position, enemy.position), enemyChara)

				createEmote(chara, "combat-emote")
				chara.emote?.setVisible(true)

				attack(squad, enemy);

				return []

			} else if (squad.path.length === 0) {
				return [operations.UPDATE_SQUAD(squad.id, {
					status: SQUAD_STATUS.IDLE
				})]
			} else {
				return [operations.UPDATE_SQUAD(squad.id, {
					status: SQUAD_STATUS.MOVING
				})]
			}
		})

}

export default moveSquads


function attack(squad: Squad, enemy: Squad) {
	emit(events.ATTACK, squad.id, enemy.id);
	const newStamina = enemy.stamina - 9 < 0 ? 0 : enemy.stamina - 9;
	emit(events.UPDATE_SQUAD, enemy.id, { stamina: newStamina });
}

function checkDestroyed(scene: BattlegroundScene) {

	scene.state.squads
		.filter(s => s.status !== SQUAD_STATUS.DESTROYED)
		.forEach(squad => {

			if (squad.stamina === 0) {
				emit(events.SQUAD_DESTROYED, squad.id);
			}

		});
}

function checkIdle(scene: BattlegroundScene) {

	scene.state.squads
		.filter(s => s.status === SQUAD_STATUS.IDLE)
		.forEach(squad => {

			const chara = scene.charas.find(c => c.id === squad.id)

			if (chara?.emote?.visible) {
				chara?.emote?.setVisible(false)
				chara?.emoteOverlay?.setVisible(false)
			}

		});
}

function updatePath(scene: BattlegroundScene) {

	scene.state.squads
		.filter(s => s.status === SQUAD_STATUS.MOVING)
		.forEach(squad => {
			emit(events.LOOKUP_PATH, squad.id, squad.position, squad.path[squad.path.length - 1]);
		});

}

function cleanupEmotes(scene: BattlegroundScene) {

	scene.state.squads
		.filter(s => s.status === SQUAD_STATUS.IDLE)
		.forEach(squad => {

			const chara = scene.charas.find(c => c.id === squad.id)
			if (!chara) return;

			chara.emote?.destroy()

		});

}