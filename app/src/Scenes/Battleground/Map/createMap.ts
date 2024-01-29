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

	return { map, layers: { background, obstacles, features } };
}
