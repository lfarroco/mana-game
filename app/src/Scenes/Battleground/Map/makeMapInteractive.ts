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
	let selectionRect: Phaser.GameObjects.Graphics = scene.add.graphics()

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


		console.log(dragX, dragY)
		const rectWidth = dragX

		const rectHeight = dragY

		selectionRect.clear()
		selectionRect.lineStyle(2, 0x00ff00, 1);

		selectionRect.strokeRect(
			rectVecStart.x,
			rectVecStart.y,
			rectWidth,
			rectHeight
		)

		scene.charas.forEach(c => c.sprite.setTint(0xffffff))
		scene.charas
			.filter(chara => rectVecStart &&
				chara.sprite.x > rectVecStart?.x &&
				chara.sprite.y > rectVecStart?.y &&
				chara.sprite.x < pointer?.x &&
				chara.sprite.y < pointer?.y
			)
			.forEach(chara => {
				if (chara.force === FORCE_ID_PLAYER)
					chara.sprite.setTint(0x00ff00)
				else
					chara.sprite.setTint(0xff0000)
			});

	});

	bgLayer.on(Phaser.Input.Events.DRAG_END, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;


		scene.charas.forEach(c => c.sprite.setTint(0xffffff))

		// charas inside selection
		const charas = scene.charas.filter(c => c.force === FORCE_ID_PLAYER).filter(chara => {
			if (!rectVecStart) return false
			return chara.sprite.x > rectVecStart?.x &&
				chara.sprite.y > rectVecStart?.y &&
				chara.sprite.x < pointer.x &&
				chara.sprite.y < pointer.y

		});

		emit(events.MULTIPLE_SQUADS_SELECTED, charas.map(c => c.id))

		rectVecStart = null
		selectionRect.clear()

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
