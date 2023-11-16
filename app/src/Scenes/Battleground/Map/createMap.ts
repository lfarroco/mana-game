import Phaser from "phaser";
import { chara } from "../chara";


export function createMap(scene: Phaser.Scene) {

	const map = scene.make.tilemap({ key: "maps/map1" });

	const tiles = map.addTilesetImage("tilesets/pipoya", "tilesets/pipoya");

	if (!tiles) {
		throw new Error("tiles is null");
	}

	const bgLayer = map.createLayer(0, tiles);
	map.createLayer(1, tiles);
	map.createLayer(2, tiles);

	map.objects.forEach((objectLayer) => {
		if (objectLayer.name === "cities") {
			objectLayer.objects.forEach((obj) => {
				if (obj.x === undefined || obj.y === undefined) {
					throw new Error("obj.x or obj.y is undefined");
				}
				const cityType: string = obj.properties.find((prop: { name: string; }) => prop.name === "type")?.value;

				if (cityType) {

					scene.add.image(obj.x, obj.y, `${cityType}_map`).setName(obj.name);
				} else {
					throw new Error("cityType is undefined");
				}
			});
		} else if (objectLayer.name === "enemies") {
			objectLayer.objects.forEach((obj) => {
				if (obj.x === undefined || obj.y === undefined) {
					throw new Error("obj.x or obj.y is undefined");
				}
				chara(obj.x, obj.y, scene);
			});
		}
	});

	if (!bgLayer) {
		throw new Error("bgLayer is null");
	}

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
		// const tile = bgLayer.getTileAtWorldXY(x, y);
		// console.log(tile)
		// tile.alpha = 0.5
	});

	return map;
}
