import { vec2, Vec2 } from "../../../Models/Geometry";
import { listeners, signals } from "../../../Models/Signals";
import BattlegroundScene from "../BattlegroundScene";

let tweens: Phaser.Tweens.Tween[] = [];

export function highlightCells(scene: BattlegroundScene, cell: Vec2, range: number) {

	const tile = scene.getTileAt(cell);

	const layer = scene.layers?.background.layer
	if (!layer) return;

	if (!tile) return;

	clearCellHighlights(scene);

	// get tiles within manhattan distance
	for (let i = -range; i <= range; i++) {
		for (let j = -range; j <= range; j++) {
			const distance = Math.abs(i) + Math.abs(j);
			if (distance <= range) {
				const vec = vec2(
					cell.x + i,
					cell.y + j
				);
				if (vec.x < 0 || vec.y < 0 || vec.x >= layer.width || vec.y >= layer.height) return;
				const tile = scene.getTileAt(vec);
				if (tile) {
					const tween = scene.tweens.add({
						targets: tile,
						alpha: 0.8,
						duration: 500,
						yoyo: true,
						repeat: -1,
					});
					tweens.push(tween);
				}
			}

		}
	}

}

export function clearCellHighlights(scene: BattlegroundScene) {
	tweens.forEach((tween) => {

		// Phaser is not typed correctly here
		(tween.targets[0] as any).alpha = 1;
		scene.tweens.remove(tween);
	});

	tweens = [];
}

export function init(scene: BattlegroundScene) {
	listeners([
		[signals.BATTLEGROUND_TICK, () => {
			clearCellHighlights(scene);
		}]
	]);
}