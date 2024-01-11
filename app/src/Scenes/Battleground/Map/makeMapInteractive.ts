import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { emit, events } from "../../../Models/Signals";
import { BoardVec, asBoardVec, boardVec } from "../../../Models/Misc";
import { FORCE_ID_PLAYER } from "../../../Models/Force";

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

		// is middle mouse button
		if (pointer.buttons !== 4) return;

		if (pointer.downTime < 100) return;

		if (pointer.distance < 10) return;

		scene.cameras.main.scrollX = scene.cameras.main.scrollX - dragX;
		scene.cameras.main.scrollY = scene.cameras.main.scrollY - dragY;
	});

	let rectVecStart: BoardVec | null = null;
	let selectionRect = scene.add.rectangle(0, 0, 0, 0, 0x00ff00, 0.5).setOrigin(0, 0)

	bgLayer.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

		// is left mouse button
		if (pointer.buttons !== 1) return;

		rectVecStart = boardVec(dragX, dragY);

		console.log("drag start", rectVecStart)


	});

	bgLayer.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

		// is left mouse button
		if (pointer.buttons !== 1) return;

		if (!rectVecStart) return;

		if (!selectionRect) return;

		const rectWidth = pointer.x - rectVecStart.x

		const rectHeight = pointer.y - rectVecStart.y

		selectionRect.setPosition(
			rectVecStart.x,
			rectVecStart.y
		);

		selectionRect.setSize(
			rectWidth,
			rectHeight
		);

		scene.charas.forEach(chara => {
			// is inside selection rect
			if (selectionRect?.getBounds().contains(chara.sprite.x, chara.sprite.y)) {
				chara.sprite.setTint(0x00ff00)
			}
			else chara.sprite.setTint(0xffffff);
		});

	});

	bgLayer.on(Phaser.Input.Events.DRAG_END, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;


		// charas inside selection
		const charas = scene.charas.filter(c => c.force === FORCE_ID_PLAYER).filter(chara => {
			return selectionRect?.getBounds().contains(chara.sprite.x, chara.sprite.y);
		});

		charas.forEach(c => c.sprite.setTint(0xffffff))

		charas.forEach(chara => {
			chara.sprite.setTint(0xff0000);
		});

		emit(events.MULTIPLE_SQUADS_SELECTED, charas.map(c => c.id))

		rectVecStart = null

		selectionRect.setPosition(0, 0).setSize(0, 0);


	});

	bgLayer.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, x: number, y: number) => {


		if (pointer.upElement?.tagName !== "CANVAS") return;

		if (scene.state.selectedEntity?.type === "squad" &&
			(pointer.rightButtonReleased() || scene.isSelectingSquadMove)
		) {

			const tile = bgLayer.getTileAtWorldXY(x, y);

			emit(
				events.SELECT_SQUAD_MOVE_DONE,
				scene.state.selectedEntity.id,
				asBoardVec(tile)
			)
		}
	});
}
