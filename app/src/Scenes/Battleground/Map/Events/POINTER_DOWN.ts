import Phaser from "phaser";

import { Vec2, vec2 } from "../../../../Models/Geometry";
import BattlegroundScene from "../../BattlegroundScene";


export function onPointerDown(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startDrag: Vec2,
	startScroll: Vec2,
	scene: BattlegroundScene
) {
	bgLayer.on(Phaser.Input.Events.POINTER_DOWN,
		(pointer: Phaser.Input.Pointer) => {
			startDrag = vec2(pointer.x, pointer.y);
			startScroll = vec2(
				scene.cameras.main.scrollX,
				scene.cameras.main.scrollY
			);
		}
	);
}
