import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { TILE_WIDTH } from "../constants";

export function makeMapInteractive(
	scene: BattlegroundScene,
	map: Phaser.Tilemaps.Tilemap,
	bgLayer: Phaser.Tilemaps.TilemapLayer
) {

	let end: Phaser.Tilemaps.Tile | null = null;
	let start: Phaser.Tilemaps.Tile | null = null;

	//set camera bounds to the world
	scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

	bgLayer?.setInteractive({ draggable: true });

	let startVector = { x: 0, y: 0 };

	bgLayer.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		startVector = { x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY };

	});

	bgLayer.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		scene.cameras.main.scrollX = startVector.x - dragX;
		scene.cameras.main.scrollY = startVector.y - dragY;

	});

	bgLayer.on("pointerup", (pointer: Phaser.Input.Pointer, x: number, y: number) => {

		const tile = bgLayer.getTileAtWorldXY(x, y);
		if (!tile) return
		tile.alpha = 0.5;
		// print tile grid x y

		console.log(tile.x, tile.y)

		if (end) {
			start = null;
			end = null;
		}

		if (!start) {
			start = tile
		} else {
			end = tile
		}

		if (start && end) {

			console.log(start, end)

			scene.findPath(start, end, path => {
				console.log(path)
				scene.graphics = scene.add.graphics();

				scene.path = { t: 0, vec: new Phaser.Math.Vector2() };

				scene.points = [];

				path.forEach(({ x, y }) => {

					const tile = bgLayer.getTileAt(x, y);

					scene.points.push(new Phaser.Math.Vector2(tile.pixelX + tile.width / 2, tile.pixelY + tile.height / 2))

				})

				scene.curve = new Phaser.Curves.Spline(scene.points);

				//this.curve.draw(this.graphics);

				const points = scene.curve.getPoints(scene.points.length * 5);
				scene.drawPoints(points)


			})

		}
	});






}
