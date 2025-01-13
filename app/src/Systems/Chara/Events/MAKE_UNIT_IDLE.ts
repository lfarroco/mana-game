import { emit, listeners, signals } from "../../../Models/Signals";
import { State } from "../../../Models/State";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";

export function init(scene: BattlegroundScene, state: State) {

	listeners([
		[signals.MAKE_UNIT_IDLE, async (unitId: string) => {

			const chara = scene.getChara(unitId);

			if (!chara.unit?.order) throw new Error("Unit order is missing");

			chara.unit.order = {
				type: "none"
			}
			emit(signals.HIDE_EMOTE, chara.unit.id);
		}]
	])
}