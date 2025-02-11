import { TURN_DURATION } from "../../config";
import { eqVec2, Vec2 } from "../../Models/Geometry";
import { emit, listeners, signals } from "../../Models/Signals";
import { State } from "../../Models/State";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { tween } from "../../Utils/animation";

export function init(scene: BattlegroundScene, state: State) {

	listeners([
		[signals.MOVE_UNIT_INTO_CELL_START, async (unitId: string, cell: Vec2) => {

			const chara = scene.getChara(unitId);

			const nextTile = scene.getTileAt(cell);

			console.log(">> tween to", cell)

			await tween(scene, {
				targets: chara.container,
				x: nextTile.getCenterX(),
				y: nextTile.getCenterY(),
				duration: TURN_DURATION / (2 * state.options.speed),
				ease: "Sine.easeInOut",
			})

			emit(signals.MOVE_UNIT_INTO_CELL_FINISH, unitId, cell);
		}],

	])
}