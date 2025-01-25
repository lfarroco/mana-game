import { TURN_DURATION } from "../../config";
import { FORCE_ID_PLAYER } from "../../Models/Force";
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

			await tween(scene, {
				targets: chara.sprite,
				x: nextTile.getCenterX(),
				y: nextTile.getCenterY(),
				duration: TURN_DURATION / (2 * state.options.speed),
				ease: "Sine.easeInOut",
			})

			emit(signals.MOVE_UNIT_INTO_CELL_FINISH, unitId, cell);
		}],
		[signals.MAKE_UNIT_IDLE, async (unitId: string) => {

			const chara = scene.getChara(unitId);

			if (!chara.unit?.order) throw new Error("Unit order is missing");

			chara.unit.order = {
				type: "none"
			}
			if (chara.unit.force === FORCE_ID_PLAYER) {
				emit(signals.DISPLAY_EMOTE, unitId, "question-emote");
			}
		}],
		// how other units react to an unit being destroyed
		[signals.UNIT_DESTROYED, async (unitId: string) => {

			const chara = scene.getChara(unitId);

			if (!chara.unit) throw new Error("Unit is missing");

			// TODO: move this to unit destroyed event
			scene.charas
				.filter(c => c.unit.hp > 0)
				.forEach(c => {
					if (c.unit.id === unitId) return;
					if (c.unit.order.type === "skill-on-unit" && c.unit.order.target === unitId) {

						c.unit.order = {
							type: "none"
						}
						emit(signals.HIDE_EMOTE, c.unit.id);
					}
				});
		}]
	])
}