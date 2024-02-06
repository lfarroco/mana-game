import { DIRECTIONS, getDirection } from "../../../Models/Direction";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { Vec2, asVec2 } from "../../../Models/Geometry";
import { listeners, signals } from "../../../Models/Signals";
import { State, getSquad } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";


type PathDisplay = {
	graphics: Phaser.GameObjects.Graphics,
	arrowTip: Phaser.GameObjects.Image
}


export function DestinationDisplaySystem_init(state: State, scene: BattlegroundScene) {

	let index: { [key: string]: PathDisplay } = {}

	listeners([
		[signals.PATH_FOUND, (key: string, path: Vec2[]) => {

			if (!state.gameData.selectedUnits.includes(key)) return

			if (!scene.layers?.background) return

			if (index[key]) {
				cleanup(index)(key);
			}

			const graphics = displayPath(
				state,
				scene,
				scene.layers.background,
				key,
				true
			)

			index[key] = graphics

		}],
		[signals.UNITS_DESELECTED, (ids: string[]) => {

			if (!scene.layers?.background) return

			ids.forEach(cleanup(index))

		}],
		[signals.UNITS_SELECTED, (ids: string[]) => {

			if (!scene.layers?.background) return

			ids
				.forEach(key => {

					cleanup(index)(key);

					if (!scene.layers?.background) return

					const squad = getSquad(state)(key)

					if (squad.path.length === 0) return

					const graphics = displayPath(
						state,
						scene,
						scene.layers.background,
						key,
						true
					)

					index[key] = graphics

				})

		}],
		[signals.SQUAD_MOVED_INTO_CELL, (key: string, cell: Vec2) => {

			if (!scene.layers?.background) return

			if (!index[key]) return

			cleanup(index)(key);

			const squad = getSquad(state)(key)

			if (squad.path.length === 0) return

			const graphics = displayPath(
				state,
				scene,
				scene.layers.background,
				key,
				false
			)

			index[key] = graphics

		}],
		[
			signals.ATTACK_STARTED,
			(key: string) => {

				if (!scene.layers?.background) return

				cleanup(index)(key);
			}
		]
	])

}

function cleanup(index: { [key: string]: PathDisplay }): (key: string) => void {
	return key => {

		if (!index[key]) return;

		index[key].graphics.destroy();
		index[key].arrowTip.destroy();

		delete index[key];
	};
}

function displayPath(
	state: State,
	scene: BattlegroundScene,
	layer: Phaser.Tilemaps.TilemapLayer,
	squadId: string,
	animate: boolean
) {

	const squad = getSquad(state)(squadId)

	const color = squad.force === FORCE_ID_PLAYER ? 0x0000ff : 0xff0000;

	const graphics = scene.add.graphics();
	const arrowTip = scene.add.image(0, 0, "arrow-left-emote").setTint(color).setScale(0.5)

	let points = [] as Phaser.Math.Vector2[]


	const path = [squad.position, ...squad.path]

	path.forEach(({ x, y }) => {

		const tile = layer.getTileAt(x, y);

		points.push(new Phaser.Math.Vector2(tile.pixelX + tile.width / 2, tile.pixelY + tile.height / 2))

	})


	let curve = new Phaser.Curves.Spline(points);

	curve.draw(graphics);

	const pointsOnCurve = curve.getPoints(points.length * 5);

	graphics.clear();
	graphics.lineStyle(5, color, 3);
	// total animation should last 1 sec
	const interval = 10;
	let time = 0;
	pointsOnCurve.forEach((current, i) => {
		scene.time.addEvent({
			delay: animate ? time : 0,
			callback: () => {
				const next = pointsOnCurve[i + 1];
				if (!next || !graphics.active || !arrowTip.active) return;
				graphics.lineBetween(current.x, current.y, next.x, next.y)

				const direction = getDirection(asVec2(current), asVec2(next))

				if (direction === DIRECTIONS.up) {
					arrowTip.setTexture("arrow-top-emote") // TODO: rename emote texture to "up"
				} else if (direction === DIRECTIONS.down) {
					arrowTip.setTexture("arrow-bottom-emote")
				} else if (direction === DIRECTIONS.left) {
					arrowTip.setTexture("arrow-left-emote")
				}
				else if (direction === DIRECTIONS.right) {
					arrowTip.setTexture("arrow-right-emote")
				}

				arrowTip.setPosition(next.x, next.y)
			}
		});
		time += interval;
	});

	const last = asVec2(points[points.length - 1])
	const tile = scene.getTileAtWorldXY(last)

	// create rect over last tile
	const border = scene.add.graphics();
	border.lineStyle(2, color, 1);
	border.strokeRect(tile.pixelX, tile.pixelY, tile.width, tile.height);
	// flashborder


	scene.tweens.add({
		targets: border,
		alpha: 0,
		duration: 100,
		repeat: 1,
		yoyo: true,
		onComplete: () => border.destroy()
	});

	return { graphics, arrowTip }

}