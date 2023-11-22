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

			state.selectedEntity = { type: "squad", id: entity.name }

			Signals.emit(Signals.index.SQUAD_SELECTED, entity.name)

		});


	});

}
