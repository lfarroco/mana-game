import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { emit, events } from "../../../Models/Signals";
import { asBoardVec } from "../../../Models/Misc";
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

	let selectionRect: Phaser.GameObjects.Graphics = scene.add.graphics()

	bgLayer.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {

		if (pointer.upElement?.tagName !== "CANVAS") return;

		// is left mouse button
		if (pointer.buttons !== 1) return;

		if (!selectionRect) return;

		if (pointer.distance < 10) return;

		selectionRect.clear()
		selectionRect.lineStyle(2, 0x00ff00, 1);

		selectionRect.strokeRect(
			pointer.downX,
			pointer.downY,
			dragX,
			dragY
		)

		scene.charas.forEach(c => c.sprite.setTint(0xffffff))
		scene.charas
			.filter(chara => isInside(pointer.downX, pointer.downY, dragX, dragY, chara.sprite.x, chara.sprite.y)
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

		const dx = dragX - pointer.downX
		const dy = dragY - pointer.downY

		// charas inside selection
		const charas = scene.charas.filter(chara =>
			isInside(pointer.downX, pointer.downY, dx, dy, chara.sprite.x, chara.sprite.y)
		);

		if (charas.length === 1) {
			emit(events.SQUAD_SELECTED, charas[0].id)
		} else if (charas.length > 0) {
			emit(events.MULTIPLE_SQUADS_SELECTED, charas.map(c => c.id))
		}


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
function isInside(x: number, y: number, w: number, h: number, px: number, py: number): boolean {

	// sometimes width and height can be negative
	// we need our rect to always be positive so that the collision may work

	return new Phaser.Geom.Rectangle(
		w < 0 ? x + w : x,
		h < 0 ? y + h : y,
		Math.abs(w),
		Math.abs(h)
	).contains(px, py)

}

