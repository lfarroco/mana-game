import Phaser from "phaser";
import { createMapEntities } from "./createMapEntities";


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

	createMapEntities(scene, map);

	return { map, layer };
}
