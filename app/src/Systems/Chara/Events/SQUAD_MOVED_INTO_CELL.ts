import { Vec2 } from '../../../Models/Geometry';
import { emit, signals, listeners } from '../../../Models/Signals';
import { State } from '../../../Models/State';
import BattlegroundScene from '../../../Scenes/Battleground/BattlegroundScene';
import { TURN_DURATION } from '../../../config';

export function init(scene: BattlegroundScene, state: State) {

	listeners([
		[signals.SQUAD_MOVED_INTO_CELL, (squadId: string, cell: Vec2) => {

			const chara = scene.getChara(squadId);

			const nextTile = scene.getTileAt(cell);

			scene.tweens.add({
				targets: chara.sprite,
				x: nextTile.getCenterX(),
				y: nextTile.getCenterY(),
				duration: TURN_DURATION / (2 * state.options.speed),
				yoyo: false,
				ease: "Sine.easeInOut",
				onComplete: () => {
					emit(signals.SQUAD_FINISHED_MOVE_ANIM, squadId, cell);
				},
			});
		}]
	])
}