import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../Models/Force";
import { TILE_WIDTH } from "../constants";
import { listeners, events } from "../../../Models/Signals";


const VIEW_RADIUS = 4;

export function createFogOfWar(scene: BattlegroundScene) {

	listeners([
		[
			// TODO: replace with "squads finished moving"
			events.BATTLEGROUND_TICK, () => {

				refreshFogOfWar(scene)
			}
		]

	])
}

function refreshFogOfWar(scene: BattlegroundScene) {

	const fow = scene.tilemap?.getLayer("map_fow")

	if (!fow) return

	fow.data.forEach(row => {
		row.forEach(tile => {
			tile.tint = 0x000000
			tile.alpha = 0.5
		})
	});


	scene.charas
		.filter(c => c.force === FORCE_ID_PLAYER)
		.forEach(c => {
			showRadius(c.body.x, c.body.y, fow);
		})

	// //player-controlled cities
	scene.cities.forEach(c => {
		showRadius(c.x, c.y, fow);
	});

	const enemies = scene.charas.filter(c => c.force === FORCE_ID_CPU)

	enemies.forEach(enemy => {

		// hide if under fog of war
		const [x, y] = [Math.floor(enemy.body.x / TILE_WIDTH), Math.floor(enemy.body.y / TILE_WIDTH)];
		const tile = fow.data[y]?.[x];
		if (!tile) return
		enemy.sprite.active = tile.alpha === 0
		enemy.sprite.visible = tile.alpha === 0

	})
}

function showRadius(worldX: number, worldY: number, fow: Phaser.Tilemaps.LayerData) {
	const [x, y] = [Math.floor(worldX / TILE_WIDTH), Math.floor(worldY / TILE_WIDTH)];

	for (let i = -(VIEW_RADIUS); i <= VIEW_RADIUS; i++) {
		for (let j = -(VIEW_RADIUS); j <= VIEW_RADIUS; j++) {

			//manhattan distance
			const dist = Math.abs(i) + Math.abs(j);

			if (dist > VIEW_RADIUS) continue;

			const tile = fow.data[y + j]?.[x + i];
			if (tile) tile.alpha = 0;

		}
	}
}
