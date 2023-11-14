import Phaser from "phaser";
import { chara } from "../chara";

export function createMap(scene: Phaser.Scene) {

	const map = scene.make.tilemap({ key: "maps/map1" });

	const tiles = map.addTilesetImage("tilesets/pipoya", "tilesets/pipoya");

	if (!tiles) {
		console.error("tiles is null");
		return;
	}

	map.createLayer(0, tiles);
	map.createLayer(1, tiles);
	map.createLayer(2, tiles);

	map.objects.forEach((objectLayer) => {
		if (objectLayer.name === "cities") {
			objectLayer.objects.forEach((obj) => {
				if (obj.x === undefined || obj.y === undefined) {
					console.error("obj.x or obj.y is undefined");
					return;
				}
				const cityType: string = obj.properties.find((prop: { name: string; }) => prop.name === "type")?.value;

				if (cityType) {

					scene.add.image(obj.x, obj.y, `${cityType}_map`).setName(obj.name);
				} else {
					console.error("cityType is undefined");
				}
			});
		} else if (objectLayer.name === "enemies") {
			objectLayer.objects.forEach((obj) => {
				if (obj.x === undefined || obj.y === undefined) {
					console.error("obj.x or obj.y is undefined");
					return;
				}
				chara(obj.x, obj.y, scene);
			});
		}
	});

}
