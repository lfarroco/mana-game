import BattlegroundScene from "../BattlegroundScene";

export function createMap(scene: BattlegroundScene) {

	const map = scene.make.tilemap({ key: "maps/map1" });

	const tiles = map.addTilesetImage("tilesets/tileset", "tilesets/tileset");

	if (!tiles) {
		throw new Error(scene.errors.errorCreatingTileset("tilesets/tileset"))
	}

	const background = map.createLayer("map_background", tiles);
	if (!background) {
		throw new Error(scene.errors.errorCreatingTilemapLayer("map_background"))
	}

	const obstacles = map.createLayer("map_obstacles", tiles);
	if (!obstacles) {
		throw new Error(scene.errors.errorCreatingTilemapLayer("map_obstacles"))
	}
	obstacles.visible = false;

	const features = map.createLayer("map_features", tiles);
	if (!features) {
		throw new Error(scene.errors.errorCreatingTilemapLayer("map_features"))
	}

	scene.add.grid(0, 0, map.widthInPixels, map.heightInPixels, 64, 64)
		.setOrigin(0, 0)
		.setOutlineStyle(0x000000).setAlpha(0.2);

	// create outline over tile being hovered
	const hoverOutline = scene.add.graphics();
	// orange
	const color = 0xffa500;
	hoverOutline.lineStyle(2, color, 1);
	hoverOutline.strokeRect(0, 0, 64, 64);
	hoverOutline.visible = false;

	// have outline follow cursor
	scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
		const tile = background.getTileAtWorldXY(
			pointer.worldX,
			pointer.worldY
		);
		if (tile) {
			hoverOutline.x = tile.pixelX;
			hoverOutline.y = tile.pixelY;
			hoverOutline.visible = true;
		} else {
			hoverOutline.visible = false;
		}
	});

	return { map, layers: { background, obstacles, features } };
}
