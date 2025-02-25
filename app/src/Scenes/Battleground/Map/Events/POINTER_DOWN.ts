import Phaser from "phaser";

import { Vec2, } from "../../../../Models/Geometry";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";


export function onPointerDown(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startScroll: Vec2,
	scene: BattlegroundScene,
) {
	const state = getState();

	bgLayer.on(Phaser.Input.Events.POINTER_DOWN,
		(pointer: Phaser.Input.Pointer) => {

			if (state.inputDisabled) {
				return;
			}

			if (pointer.downElement !== scene.game.canvas) {
				console.log("down element is not canvas, exit POINTER_DOWN event");
				return;
			}

			if (state.options.scrollEnabled) {

				startScroll.x = scene.cameras.main.scrollX
				startScroll.y = scene.cameras.main.scrollY

				console.log("SET startScroll", startScroll);
			}
		}
	);
}