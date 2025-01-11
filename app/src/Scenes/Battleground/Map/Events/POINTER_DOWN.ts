import Phaser from "phaser";

import { Vec2, asVec2, } from "../../../../Models/Geometry";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { Unit } from "../../../../Models/Unit";
import { selectEntityInTile } from "../makeMapInteractive";


export function onPointerDown(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startScroll: Vec2,
	scene: BattlegroundScene,
	pointerDownUnit: { unit: Unit | null }
) {
	const state = getState();

	bgLayer.on(Phaser.Input.Events.POINTER_DOWN,
		(pointer: Phaser.Input.Pointer) => {

			const tile = bgLayer.getTileAtWorldXY(pointer.worldX, pointer.worldY);

			const [unit] = selectEntityInTile(state, asVec2(tile))

			if (unit) {
				pointerDownUnit.unit = unit;
			}

			startScroll.x = scene.cameras.main.scrollX
			startScroll.y = scene.cameras.main.scrollY

			console.log("SET startScroll", startScroll);
		}
	);
}
