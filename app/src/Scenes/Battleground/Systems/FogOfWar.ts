import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../Models/Force";
import { listeners, events } from "../../../Models/Signals";
import { SQUAD_STATUS } from "../../../Models/Squad";
import { BoardVec } from "../../../Models/Misc";

const VIEW_RADIUS = 4;

export function init(scene: BattlegroundScene) {

	const fowTilemap = scene.make.tilemap({ key: "maps/map1" });

	const tiles = fowTilemap.addTilesetImage("tilesets/pipoya", "tilesets/pipoya");

	if (!tiles) throw new Error("tile is null")

	const fow = fowTilemap.createBlankLayer("map_fow", tiles);

	if (!fow) throw new Error("fow is null")

	// populate fow with tiles
	if (fow) {
		fow.fill(1, 0, 0, fow.width, fow.height, true);
		fow.forEachTile(t => {
			t.tint = 0x000000
		})
	}

	listeners([
		[
			// TODO: replace with "squads finished moving"
			events.BATTLEGROUND_TICK, () => {

				refreshFogOfWar(scene, fow)
			}
		]

	])
}

// takes around 0.2~3 ms to run in a 64x64 board and can be optimized
// it is actually slower to use a for loop instead of forEach (takes 0.9ms)
function refreshFogOfWar(scene: BattlegroundScene, fow: Phaser.Tilemaps.TilemapLayer) {

	// tried to use fow.culledTiles, but the tiles
	// are not set back to hidden
	fow.forEachTile(tile => {
		tile.tint = 0x000000
		tile.alpha = 0.6
	});

	scene.state.squads
		.filter(s => s.force === FORCE_ID_PLAYER)
		.filter(s => s.status !== SQUAD_STATUS.DESTROYED && s.status !== SQUAD_STATUS.NON_DISPATCHED)
		.forEach(s => showRadius(s.position, fow));

	//player-controlled cities
	scene.state.cities
		.filter(c => c.force === FORCE_ID_PLAYER)
		.forEach(c => showRadius(c.boardPosition, fow));

	scene.state.squads
		.filter(s => s.force === FORCE_ID_CPU)
		.filter(s => s.status !== SQUAD_STATUS.DESTROYED && s.status !== SQUAD_STATUS.NON_DISPATCHED)
		.forEach(enemy => {

			const chara = scene.charas.find(c => c.id === enemy.id)
			if (!chara) throw new Error("chara is null")

			// hide if under fog of war
			const tile = fow.getTileAt(enemy.position.x, enemy.position.y)
			if (!tile) throw new Error("tile is null")

			const visible = tile.alpha === 0;

			chara.group?.setVisible(visible)
		})
}

function showRadius({ x, y }: BoardVec, fow: Phaser.Tilemaps.TilemapLayer) {


	for (let i = -(VIEW_RADIUS); i <= VIEW_RADIUS; i++) {
		for (let j = -(VIEW_RADIUS); j <= VIEW_RADIUS; j++) {

			//manhattan distance
			const dist = Math.abs(i) + Math.abs(j);

			if (dist > VIEW_RADIUS) continue;

			const tile = fow.getTileAt(i + x, j + y);
			if (!tile) continue;
			tile.alpha = 0;
		}
	}
}
