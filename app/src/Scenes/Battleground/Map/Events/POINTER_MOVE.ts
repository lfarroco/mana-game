import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { Vec2 } from "../../../../Models/Geometry";
import { Unit } from "../../../../Models/Unit";
import { listen, signals } from "../../../../Models/Signals";
import { FORCE_ID_PLAYER } from "../../../../Models/Force";

export function onPointerMove(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startScroll: Vec2,
	scene: BattlegroundScene,
	pointerDownUnit: { unit: Unit | null }
) {

	let lineGraphics = scene.add.graphics();

	bgLayer.on(Phaser.Input.Events.POINTER_MOVE,
		(pointer: Phaser.Input.Pointer) => {

			if (!pointer.isDown) return;
			if (pointer.downTime < 100) return;

			const dx = pointer.downX - pointer.x;
			const dy = pointer.downY - pointer.y;

			if ((Math.abs(dx) + Math.abs(dy)) < 10) return;

			if (pointerDownUnit.unit && pointerDownUnit.unit.force === FORCE_ID_PLAYER) {

				// selecting unit destination, draw line to current position
				const chara = scene.charas
					.filter(c => c.unit.hp > 0)
					.find(chara => chara.id === pointerDownUnit.unit?.id);

				if (!chara) return;

				lineGraphics.clear();
				lineGraphics.lineStyle(2, 0xff0000);
				lineGraphics.beginPath();
				lineGraphics.moveTo(chara.sprite.x, chara.sprite.y);
				lineGraphics.lineTo(pointer.x + scene.cameras.main.scrollX, pointer.y + scene.cameras.main.scrollY);
				lineGraphics.closePath();
				lineGraphics.strokePath();

			} else {

				// dragging the camera is only allowed if the pointer was not pressed over a unit

				scene.cameras.main.scrollX = startScroll.x + dx;
				scene.cameras.main.scrollY = startScroll.y + dy;
			}
		}
	);

	listen(signals.SELECT_UNIT_MOVE_DONE, () => {

		lineGraphics.clear();

	})

}
