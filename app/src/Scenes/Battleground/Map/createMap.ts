import Phaser from "phaser";

export function createMap(scene: Phaser.Scene) {

	const map = scene.make.tilemap({ key: "maps/map1" });

	const tiles = map.addTilesetImage("tilesets/pipoya", "tilesets/pipoya");

	if (!tiles) {
		throw new Error("tiles is null");
	}

	const background = map.createLayer("map_background", tiles);
	if (!background) {
		throw new Error("background layer is null");
	}

	const obstacles = map.createLayer("map_obstacles", tiles);
	if (!obstacles) {
		throw new Error("obstacles layer is null");
	}
	obstacles.visible = false;

	const features = map.createLayer("map_features", tiles);
	if (!features) {
		throw new Error("obstacles layer is null");
	}

	const fow = map.createBlankLayer("map_fow", tiles);

	// populate fow with tiles
	if (fow) {
		fow.fill(1, 0, 0, 32, 32, true);
		console.time("wee")
		fow.forEachTile(t => {
			t.tint = 0x000000
			t.alpha = 0.5
		})
		console.timeEnd('wee')
	}

	//@ts-ignore
	window.layers = { background, obstacles, features, fow };

	return { map, layers: { background, obstacles, features, fow } };
}
