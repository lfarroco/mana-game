import { Vec2 } from '../../../Models/Geometry';
import { emit, signals, listeners } from '../../../Models/Signals';
import { State } from '../../../Models/State';
import BattlegroundScene from '../../../Scenes/Battleground/BattlegroundScene';
import { TURN_DURATION } from '../../../config';

export function init(scene: BattlegroundScene, state: State) {

	listeners([
		[signals.UNIT_MOVED_INTO_CELL, (unitId: string, cell: Vec2) => {

			const chara = scene.getChara(unitId);

			const nextTile = scene.getTileAt(cell);

			scene.tweens.add({
				targets: chara.sprite,
				x: nextTile.getCenterX(),
				y: nextTile.getCenterY(),
				duration: TURN_DURATION / (2 * state.options.speed),
				yoyo: false,
				ease: "Sine.easeInOut",
				onComplete: () => {
					emit(signals.UNIT_FINISHED_MOVE_ANIM, unitId, cell);
				},
			});
		}]
	])
}