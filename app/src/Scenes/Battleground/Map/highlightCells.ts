import { vec2, Vec2 } from "../../../Models/Geometry";
import BattlegroundScene from "../BattlegroundScene";

export function highlightCells(scene: BattlegroundScene, cell: Vec2, range: number) {

	const tile = scene.getTileAt(cell);

	if (!tile) return;

	// get tiles within manhattan distance
	let tilesInRange: Phaser.Tilemaps.Tile[] = [];
	for (let i = -range; i <= range; i++) {
		for (let j = -range; j <= range; j++) {
			const distance = Math.abs(i) + Math.abs(j);
			if (distance <= range) {
				const vec = vec2(
					cell.x + i,
					cell.y + j
				);
				if (vec.x < 0 || vec.y < 0) continue;
				const tile = scene.getTileAt(vec);
				if (tile) {
					tilesInRange.push(tile);
				}
			}

		}
	}

	tilesInRange?.forEach((tile) => {
		scene.tweens.add({
			targets: tile,
			alpha: 0.8,
			duration: 500,
			yoyo: true,
			repeat: 2,
		});
	});
}