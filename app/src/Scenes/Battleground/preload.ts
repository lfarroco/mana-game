import Phaser from "phaser";

export function preload(this: Phaser.Scene) {
	["castle", "cave", "fort", "town"].forEach(city => {
		this.load.image(city, `assets/cities/${city}.png`);
		this.load.image(`${city}_map`, `assets/cities/${city}_map.png`);

	});
	this.load.image("tilesets/pipoya", "assets/tilesets/pipoya.png");
	this.load.image("cursor", "assets/ui/selected_cursor.png");
	this.load.tilemapTiledJSON("maps/map1", "assets/maps/map1/mapdata.json");

	//@ts-ignore
	this.load.spineBinary("spine-data", "assets/spine/_base/skeleton.skel");
	//@ts-ignore
	this.load.spineAtlas("spine-atlas", "assets/spine/_base/skeleton.atlas");
}
