import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { Unit } from "../../../../Models/Unit";

export function onPointerUp(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	scene: BattlegroundScene,
	unitPointerDown: { unit: Unit | null }
) {
	bgLayer.on(Phaser.Input.Events.POINTER_UP,
		(pointer: Phaser.Input.Pointer) => {

			const state = getState();

			if (state.inputDisabled) {
				console.log("input disabled, exit POINTER_UP event");
				return;
			}

			if (pointer.downElement !== scene.game.canvas) {
				console.log("down element is not canvas, exit POINTER_UP event");
				return;
			}

			const tile = bgLayer.getTileAtWorldXY(pointer.worldX, pointer.worldY);

			console.log("clicked tile", tile);

			const isDrag = pointer.downTime > 100 && pointer.getDistance() > 10

			console.log("distance", pointer.getDistance());
			console.log("downtime", pointer.downTime);
			console.log("isDrag?", isDrag);

			if (unitPointerDown.unit && isDrag) {

			} else {
				unitPointerDown.unit = null;
			}

		}
	);
}
