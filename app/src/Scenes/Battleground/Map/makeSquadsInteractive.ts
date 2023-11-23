import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { BGState, getState } from "../BGState";
import * as Signals from "../../../Models/Signals";
import { windowVec } from "../../../Models/Misc";

export function makeSquadsInteractive(
	scene: BattlegroundScene,
	entities: Phaser.Types.Physics.Arcade.ImageWithDynamicBody[]
) {

	entities.forEach(entity => {

		makeSquadInteractive(entity, scene);
	});
}
export function makeSquadInteractive(entity: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, scene: BattlegroundScene) {

	entity.setInteractive();
	entity.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, x: number, y: number) => {

		const state = getState();

		if (pointer.upElement.tagName !== "CANVAS") return;

		if (scene.isSelectingSquadMove && state.selectedEntity?.type === "squad") {
			Signals.emit(
				Signals.index.SELECT_SQUAD_MOVE_DONE,
				state.selectedEntity.id,
				windowVec(entity.x, entity.y)
			);
		} else {
			Signals.emit(Signals.index.SQUAD_SELECTED, entity.name);
		}
	});
}

