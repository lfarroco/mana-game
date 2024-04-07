import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { Vec2 } from "../../../../Models/Geometry";

export function onPointerMove(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startDrag: Vec2,
	startScroll: Vec2,
	scene: BattlegroundScene,
) {
	bgLayer.on(Phaser.Input.Events.POINTER_MOVE,
		(pointer: Phaser.Input.Pointer) => {

			if (!pointer.isDown) return;
			if (pointer.downTime < 100) return;

			const dx = startDrag.x - pointer.x;
			const dy = startDrag.y - pointer.y;
			const delta = Math.abs(dx + dy);

			if (delta < 10) return;

			scene.cameras.main.scrollX = startScroll.x + dx;
			scene.cameras.main.scrollY = startScroll.y + dy;
		}
	);
}
