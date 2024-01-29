import { Vec2 } from '../../../Models/Geometry';
import { emit, events, listeners } from '../../../Models/Signals';
import { State } from '../../../Models/State';
import BattlegroundScene from '../../../Scenes/Battleground/BattlegroundScene';
import { TURN_DURATION } from '../../../config';


export function init(scene: BattlegroundScene, state: State) {

	listeners([
		[events.SQUAD_MOVED_INTO_CELL, (squadId: string, cell: Vec2) => {

			const chara = scene.getChara(squadId);

			const nextTile = scene.layers?.background.getTileAt(cell.x, cell.y);

			if (!nextTile) throw new Error(scene.errors.noTileAt(cell));

			scene.tweens.add({
				targets: chara.sprite,
				x: nextTile.getCenterX(),
				y: nextTile.getCenterY(),
				duration: TURN_DURATION / (2 * state.options.speed),
				yoyo: false,
				ease: "Sine.easeInOut",
				onComplete: () => {
					emit(events.SQUAD_FINISHED_MOVE_ANIM, squadId);
				},
			});
		}]
	])
}