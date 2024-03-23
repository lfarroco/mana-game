import { DIRECTIONS, getDirection } from "../../../Models/Direction";
import { Vec2, asVec2 } from "../../../Models/Geometry";
import { listeners, signals } from "../../../Models/Signals";
import { State, getUnit } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";

const LINE_COLOR = 0xff0000;
const LINE_WIDTH = 4;
const SHADOW_WIDTH = 4;
const SHADOW_COLOR = 0x000;

type PathDisplay = {
	graphics: Phaser.GameObjects.Graphics;
	arrowTip: Phaser.GameObjects.Image;
	shadow: Phaser.GameObjects.Graphics;
	shadowArrowTip: Phaser.GameObjects.Image;
}

export function DestinationDisplaySystem_init(state: State, scene: BattlegroundScene) {

	let index: { [key: string]: PathDisplay } = {}

	listeners([
		[signals.PATH_FOUND, (key: string, _path: Vec2[]) => {

			if (state.gameData.selectedUnit !== key) return

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
		[signals.UNIT_DESELECTED, (id: string) => {

			if (!scene.layers?.background) return

			cleanup(index)(id)

		}],
		[signals.UNIT_SELECTED, (key: string) => {

			if (!scene.layers?.background) return


			cleanup(index)(key);

			if (!scene.layers?.background) return

			const unit = getUnit(state)(key)

			if (unit.path.length === 0) return

			const graphics = displayPath(
				state,
				scene,
				scene.layers.background,
				key,
				true
			)

			index[key] = graphics


		}],
		[signals.UNIT_MOVED_INTO_CELL, (key: string, cell: Vec2) => {

			if (!scene.layers?.background) return

			if (!index[key]) return

			cleanup(index)(key);

			const unit = getUnit(state)(key)

			if (unit.path.length === 0) return

			const graphics = displayPath(
				state,
				scene,
				scene.layers.background,
				key,
				false
			)

			index[key] = graphics

		}],
		[signals.SELECT_SKILL_TARGET_DONE, (key: string) => {

			if (!scene.layers?.background) return

			cleanup(index)(key);

		}],
		[signals.ATTACK_STARTED, (key: string) => {

			if (!scene.layers?.background) return

			cleanup(index)(key);
		}],
		[signals.UNIT_MOVE_STOP, (key: string) => {

			if (!scene.layers?.background) return

			cleanup(index)(key);
		}]
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
	unitId: string,
	animate: boolean
) {

	const unit = getUnit(state)(unitId)


	const shadowGraphics = scene.add.graphics();
	const lineGraphics = scene.add.graphics();
	const arrowTip = scene.add.image(0, 0, "arrow-left-emote").setTint(0x000).setScale(0.5)
	const shadowArrowTip = scene.add.image(0, 0, "arrow-left-emote").setTint(0xff0000).setScale(0.5)

	scene.children.moveBelow(arrowTip, lineGraphics)
	let points = [] as Phaser.Math.Vector2[]

	const path = [unit.position, ...unit.path]

	if (path.length < 2) return { graphics: shadowGraphics, arrowTip, shadow: lineGraphics, shadowArrowTip }

	path.forEach(({ x, y }) => {

		const tile = layer.getTileAt(x, y);

		points.push(new Phaser.Math.Vector2(tile.pixelX + tile.width / 2, tile.pixelY + tile.height / 2))

	})

	// replace the two first points with the point between them (eg: [ (1,1), (3,3) ] -> [(2,2)]
	const newPoint = new Phaser.Math.Vector2(points[0].x + (points[1].x - points[0].x) / 2, points[0].y + (points[1].y - points[0].y) / 2)

	// replace points 0 and 1 with the new point

	points = [newPoint, ...points.slice(1)]


	const curve = new Phaser.Curves.Spline(points);
	curve.draw(shadowGraphics);

	curve.draw(lineGraphics);

	const pointsOnCurve = curve.getPoints(points.length * 5);

	lineGraphics.clear();
	lineGraphics.lineStyle(LINE_WIDTH, LINE_COLOR, 3);

	shadowGraphics.clear();
	shadowGraphics.lineStyle(SHADOW_WIDTH, SHADOW_COLOR, 3);

	const interval = 250 / (points.length * 5);
	let time = 0;
	pointsOnCurve.forEach((current, i) => {
		scene.time.addEvent({
			delay: animate ? time : 0,
			callback: () => {
				const next = pointsOnCurve[i + 1];
				if (!next || !shadowGraphics.active) return;

				lineGraphics.lineBetween(current.x + 2, current.y + 2, next.x + 2, next.y + 2);
				shadowGraphics.lineBetween(current.x, current.y, next.x, next.y)

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
	border.lineStyle(2, SHADOW_COLOR, 1);
	border.strokeRect(tile.pixelX, tile.pixelY, tile.width, tile.height);

	scene.tweens.add({
		targets: border,
		alpha: 0,
		duration: 100,
		repeat: 1,
		yoyo: true,
		onComplete: () => border.destroy()
	});

	return { graphics: shadowGraphics, arrowTip, shadow: lineGraphics, shadowArrowTip }

}