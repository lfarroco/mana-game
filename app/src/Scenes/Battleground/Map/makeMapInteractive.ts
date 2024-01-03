import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { emit, events } from "../../../Models/Signals";
import { windowVec } from "../../../Models/Misc";

export function makeMapInteractive(
	scene: BattlegroundScene,
	map: Phaser.Tilemaps.Tilemap,
	bgLayer: Phaser.Tilemaps.TilemapLayer
) {

	console.log("adding map listeners")
	//set camera bounds to the world
	scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

	bgLayer?.setInteractive({ draggable: true });


	bgLayer.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;


	});

	bgLayer.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

		if (pointer.downTime < 100) return;

		if (pointer.distance < 10) return;

		scene.cameras.main.scrollX = scene.cameras.main.scrollX - dragX;
		scene.cameras.main.scrollY = scene.cameras.main.scrollY - dragY;
	});

	bgLayer.on(Phaser.Input.Events.DRAG_END, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

	});

	bgLayer.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, x: number, y: number) => {


		if (pointer.upElement?.tagName !== "CANVAS") return;

		if (scene.state.selectedEntity?.type === "squad" &&
			(pointer.rightButtonReleased() || scene.isSelectingSquadMove)
		) {
			emit(
				events.SELECT_SQUAD_MOVE_DONE,
				scene.state.selectedEntity.id,
				windowVec(x, y)
			)
		}
	});
}
