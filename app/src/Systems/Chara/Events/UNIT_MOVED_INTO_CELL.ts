import { Vec2 } from '../../../Models/Geometry';
import { signals, listeners } from '../../../Models/Signals';
import { State } from '../../../Models/State';
import BattlegroundScene from '../../../Scenes/Battleground/BattlegroundScene';
import { tween } from '../../../Utils/animation';
import { TURN_DURATION } from '../../../config';

export function init(scene: BattlegroundScene, state: State) {

	listeners([
		[signals.MOVE_UNIT_INTO_CELL, async (unitId: string, cell: Vec2) => {

			const chara = scene.getChara(unitId);

			const nextTile = scene.getTileAt(cell);

			await tween(scene, {
				targets: chara.sprite,
				x: nextTile.getCenterX(),
				y: nextTile.getCenterY(),
				duration: TURN_DURATION / (2 * state.options.speed),
				ease: "Sine.easeInOut",
			})
		}]
	])
}