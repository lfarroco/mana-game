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

			unitPointerDown.unit = null;

		}
	);
}
