import Phaser from "phaser";
import { chara } from "../chara";


export function createMap(scene: Phaser.Scene) {

	const map = scene.make.tilemap({ key: "maps/map1" });

	const tiles = map.addTilesetImage("tilesets/pipoya", "tilesets/pipoya");

	if (!tiles) {
		throw new Error("tiles is null");
	}

	const layer = map.createLayer(0, tiles);
	if (!layer) {
		throw new Error("layer is null");
	}
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

	return { map, layer };
}
