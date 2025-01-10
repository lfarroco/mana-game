import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { Vec2 } from "../../../../Models/Geometry";
import { Unit } from "../../../../Models/Unit";
import { listen, signals } from "../../../../Models/Signals";

export function onPointerMove(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startDrag: Vec2,
	startScroll: Vec2,
	scene: BattlegroundScene,
	pointerDownUnit: { unit: Unit | null }
) {

	let lineGraphics = scene.add.graphics();

	bgLayer.on(Phaser.Input.Events.POINTER_MOVE,
		(pointer: Phaser.Input.Pointer) => {

			if (!pointer.isDown) return;
			if (pointer.downTime < 100) return;
			if (startDrag.x < 0 || startDrag.y < 0) {
				startDrag.x = pointer.x;
				startDrag.y = pointer.y;
			}

			const dx = startDrag.x - pointer.x;
			const dy = startDrag.y - pointer.y;
			const delta = Math.abs(dx + dy);

			if (delta < 10) return;

			if (pointerDownUnit.unit) {
				// selecting unit destination, draw line to current position
				const chara = scene.charas.find(chara => chara.id === pointerDownUnit.unit?.id);

				if (!chara) return;

				lineGraphics.clear();
				lineGraphics.lineStyle(2, 0xff0000);
				lineGraphics.beginPath();
				lineGraphics.moveTo(chara.sprite.x, chara.sprite.y);
				lineGraphics.lineTo(pointer.x + scene.cameras.main.scrollX, pointer.y + scene.cameras.main.scrollY);
				lineGraphics.closePath();
				lineGraphics.strokePath();

			}

			scene.cameras.main.scrollX = startScroll.x + dx;
			scene.cameras.main.scrollY = startScroll.y + dy;
		}
	);

	listen(signals.SELECT_UNIT_MOVE_DONE, () => {

		lineGraphics.clear();

	})

}
