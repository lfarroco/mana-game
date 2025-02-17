import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { Vec2 } from "../../../../Models/Geometry";
import { Unit } from "../../../../Models/Unit";
import { getState } from "../../../../Models/State";

export function onPointerMove(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startScroll: Vec2,
	scene: BattlegroundScene,
	pointerDownUnit: { unit: Unit | null }
) {

	const state = getState();

	bgLayer.on(Phaser.Input.Events.POINTER_MOVE,
		(pointer: Phaser.Input.Pointer) => {

			if (!state.options.scrollEnabled) return;
			if (!pointer.isDown) return;
			if (state.inputDisabled) return
			if (pointer.downTime < 100) return;

			if (pointer.downElement !== scene.game.canvas) {
				console.log("down element is not canvas, exit POINTER_MOVE event");
				return;
			}

			const dx = pointer.downX - pointer.x;
			const dy = pointer.downY - pointer.y;

			if ((Math.abs(dx) + Math.abs(dy)) < 10) return;

			// dragging the camera is only allowed if the pointer was not pressed over a unit

			scene.cameras.main.scrollX = startScroll.x + dx;
			scene.cameras.main.scrollY = startScroll.y + dy;
		}
	);

}
