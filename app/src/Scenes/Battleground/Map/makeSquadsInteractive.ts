import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { getState } from "../BGState";

export function makeSquadsInteractive(
	scene: BattlegroundScene,
	entities: Phaser.Types.Physics.Arcade.ImageWithDynamicBody[]
) {

	const state = getState();

	entities.forEach(entity => {

		entity.setInteractive();
		entity.on("pointerup", (pointer: Phaser.Input.Pointer, x: number, y: number) => {

			if (pointer.upElement.tagName !== "CANVAS") return;

			state.selectedEntity = { type: "squad", id: entity.name }

			scene.gameEvents.emit("SQUAD_SELECTED", entity.name);
			scene.selectedEntity = entity;

		});


	});

}
