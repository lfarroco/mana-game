import { Vec2 } from "../../../Models/Geometry";
import { listeners, signals } from "../../../Models/Signals";
import { State, getSquad } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";



export function DestinationDisplaySystem_init(state: State, scene: BattlegroundScene) {

	let index: { [key: string]: Phaser.GameObjects.Graphics } = {}

	listeners([
		[signals.PATH_FOUND, (key: string, path: Vec2[]) => {

			if (!state.gameData.selectedUnits.includes(key)) return

			if (!scene.layers?.background) return

			if (index[key]) return

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

		}]
	])

}

function cleanup(index: { [key: string]: Phaser.GameObjects.Graphics; }): (key: string) => void {
	return key => {

		if (!index[key]) return;

		index[key].destroy();

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

	const graphics = scene.add.graphics();

	let points = [] as Phaser.Math.Vector2[]

	const path = [squad.position, ...squad.path]

	path.forEach(({ x, y }) => {

		const tile = layer.getTileAt(x, y);

		points.push(new Phaser.Math.Vector2(tile.pixelX + tile.width / 2, tile.pixelY + tile.height / 2))

	})


	let curve = new Phaser.Curves.Spline(points);

	curve.draw(graphics);

	const pointsOnCurve = curve.getPoints(points.length * 4);

	graphics.clear();
	graphics.lineStyle(5, 0xff0000, 3);
	const interval = 10;
	let time = 0;
	for (let i = 1; i < pointsOnCurve.length; i++) {
		scene.time.addEvent({
			delay: animate ? time : 0,
			callback: () => {
				const current = pointsOnCurve[i];
				const next = pointsOnCurve[i + 1];
				if (!next) return;
				graphics.lineBetween(current.x, current.y, next.x, next.y)
			}
		});
		time += interval;
	}

	return graphics

}