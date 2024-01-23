import { BattlegroundScene } from "../../BattlegroundScene";

export function createFowLayer(scene: BattlegroundScene) {
	const fowTilemap = scene.make.tilemap({ key: "maps/map1" });

	const tiles = fowTilemap.addTilesetImage(
		"tilesets/tileset",
		"tilesets/tileset"
	);

	if (!tiles) throw new Error("tile is null");

	const fow = fowTilemap.createBlankLayer("map_fow", tiles);

	if (!fow) throw new Error("fow is null");

	// populate fow with tiles
	if (fow) {
		fow.fill(1, 0, 0, fow.width, fow.height, true);
		fow.forEachTile((t) => {
			t.tint = 0;
		});
	}
	return fow;
}
