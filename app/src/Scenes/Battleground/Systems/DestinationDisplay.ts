import { DIRECTIONS, getDirection } from "../../../Models/Direction";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { Vec2, asVec2 } from "../../../Models/Geometry";
import { listeners, signals } from "../../../Models/Signals";
import { State, getSquad } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";


type PathDisplay = {
	graphics: Phaser.GameObjects.Graphics;
	arrowTip: Phaser.GameObjects.Image;
	shadow: Phaser.GameObjects.Graphics;
	shadowArrowTip: Phaser.GameObjects.Image;
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
		index[key].shadow.destroy();
		index[key].shadowArrowTip.destroy();

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

	// orange
	const color = 0x000;

	const graphics = scene.add.graphics();
	const shadow = scene.add.graphics();
	const arrowTip = scene.add.image(0, 0, "arrow-left-emote").setTint(0x000).setScale(0.8)
	const shadowArrowTip = scene.add.image(0, 0, "arrow-left-emote").setTint(0xff0000).setScale(0.8)

	scene.children.moveBelow(arrowTip, shadow)
	let points = [] as Phaser.Math.Vector2[]


	const path = [squad.position, ...squad.path]

	if (path.length < 2) return { graphics, arrowTip, shadow, shadowArrowTip }

	path.forEach(({ x, y }) => {

		const tile = layer.getTileAt(x, y);

		points.push(new Phaser.Math.Vector2(tile.pixelX + tile.width / 2, tile.pixelY + tile.height / 2))

	})

	// replace the two first points with the point between them (eg: [ (1,1), (3,3) ] -> [(2,2)]
	const newPoint = new Phaser.Math.Vector2(points[0].x + (points[1].x - points[0].x) / 2, points[0].y + (points[1].y - points[0].y) / 2)

	// replace points 0 and 1 with the new point

	points = [newPoint, ...points.slice(1)]


	const curve = new Phaser.Curves.Spline(points);
	curve.draw(graphics);

	curve.draw(shadow);

	const pointsOnCurve = curve.getPoints(points.length * 5);

	shadow.clear();
	shadow.lineStyle(5, 0xff0000, 3);

	graphics.clear();
	graphics.lineStyle(5, color, 3);

	// total animation should last 1 sec
	const interval = 500 / (points.length * 5);
	let time = 0;
	pointsOnCurve.forEach((current, i) => {
		scene.time.addEvent({
			delay: animate ? time : 0,
			callback: () => {
				const next = pointsOnCurve[i + 1];
				if (!next || !graphics.active) return;

				shadow.lineBetween(current.x + 2, current.y + 2, next.x + 2, next.y + 2);
				graphics.lineBetween(current.x, current.y, next.x, next.y)

				const direction = getDirection(asVec2(current), asVec2(next))

				if (direction === DIRECTIONS.up) {
					arrowTip.setTexture("arrow-top-emote") // TODO: rename emote texture to "up"
					shadowArrowTip.setTexture("arrow-top-emote")
				} else if (direction === DIRECTIONS.down) {
					arrowTip.setTexture("arrow-bottom-emote")
					shadowArrowTip.setTexture("arrow-bottom-emote")
				} else if (direction === DIRECTIONS.left) {
					arrowTip.setTexture("arrow-left-emote")
					shadowArrowTip.setTexture("arrow-left-emote")
				}
				else if (direction === DIRECTIONS.right) {
					arrowTip.setTexture("arrow-right-emote")
					shadowArrowTip.setTexture("arrow-right-emote")
				}

				arrowTip.setPosition(next.x, next.y)
				shadowArrowTip.setPosition(next.x + 2, next.y + 2)
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

	scene.tweens.add({
		targets: border,
		alpha: 0,
		duration: 100,
		repeat: 1,
		yoyo: true,
		onComplete: () => border.destroy()
	});

	return { graphics, arrowTip, shadow, shadowArrowTip }

}