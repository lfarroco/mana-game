import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";

export function makeSquadsInteractive(
	scene: BattlegroundScene,
	entities: Phaser.Types.Physics.Arcade.ImageWithDynamicBody[]
) {

	entities.forEach(entity => {

		entity.setInteractive();
		entity.on("pointerup", (pointer: Phaser.Input.Pointer, x: number, y: number) => {

			scene.gameEvents.emit("SQUAD_SELECTED", entity.name);
			entity.alpha = 0.5;
			scene.selectedEntity = entity;

		});


	});

}
