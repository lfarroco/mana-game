import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import * as Signals from "../../../Models/Signals";

export function makeMapInteractive(
	scene: BattlegroundScene,
	map: Phaser.Tilemaps.Tilemap,
	bgLayer: Phaser.Tilemaps.TilemapLayer
) {

	console.log("adding map listeners")
	//set camera bounds to the world
	scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

	bgLayer?.setInteractive({ draggable: true });

	let startVector = { x: 0, y: 0 };
	let startDragTime = 0;

	bgLayer.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

		startVector = { x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY };
		startDragTime = Date.now();

	});

	bgLayer.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

		if (pointer.downTime < 100) return;

		if (pointer.distance < 10) return;

		scene.cameras.main.scrollX = scene.cameras.main.scrollX + startVector.x - dragX;
		scene.cameras.main.scrollY = scene.cameras.main.scrollY + startVector.y - dragY;
	});

	bgLayer.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, x: number, y: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

		if (!scene.isSelectingSquadMove) return

		if (scene.isSelectingSquadMove && scene.state.selectedEntity?.type === "squad") {

			Signals.emit(
				Signals.index.SELECT_SQUAD_MOVE_DONE,
				scene.state.selectedEntity.id,
				{ x: x, y: y }
			)
		}
	});
}
