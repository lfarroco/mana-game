import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { getState } from "../BGState";
import * as Signals from "../../../Models/Signals";

export function makeSquadsInteractive(
	scene: BattlegroundScene,
	entities: Phaser.Types.Physics.Arcade.ImageWithDynamicBody[]
) {

	const state = getState();

	entities.forEach(entity => {

		entity.setInteractive();
		entity.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, x: number, y: number) => {

			if (pointer.upElement.tagName !== "CANVAS") return;

			if (scene.isSelectingSquadMove && state.selectedEntity?.type === "squad") {
				Signals.emit(
					Signals.index.SELECT_SQUAD_MOVE_DONE,
					state.selectedEntity.id,
					{ x, y }
				)
			} else {
				Signals.emit(Signals.index.SQUAD_SELECTED, entity.name)
			}
		});
	});
}
