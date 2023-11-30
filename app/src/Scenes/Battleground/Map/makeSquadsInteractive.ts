import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { getState } from "../../../Models/State";
import { events, emit } from "../../../Models/Signals";
import { windowVec } from "../../../Models/Misc";
import { Chara } from "../../../Components/chara";

export function makeSquadsInteractive(
	scene: BattlegroundScene,
	entities: Chara[]
) {

	entities.forEach(entity => {

		makeSquadInteractive(entity, scene);
	});
}
export function makeSquadInteractive(chara: Chara, scene: BattlegroundScene) {

	scene.input.enableDebug(chara.clickZone);
	chara.clickZone.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, x: number, y: number) => {

		const state = getState();

		if (pointer.upElement.tagName !== "CANVAS") return;

		if (scene.isSelectingSquadMove && state.selectedEntity?.type === "squad") {
			emit(
				events.SELECT_SQUAD_MOVE_DONE,
				state.selectedEntity.id,
				windowVec(chara.body.x, chara.body.y)
			);
		} else {
			emit(
				events.SQUAD_SELECTED,
				chara.id
			);
		}
	});
}

