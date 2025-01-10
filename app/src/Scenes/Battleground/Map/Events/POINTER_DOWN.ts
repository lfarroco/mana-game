import Phaser from "phaser";

import { Vec2, eqVec2, vec2 } from "../../../../Models/Geometry";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { Unit } from "../../../../Models/Unit";


export function onPointerDown(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startScroll: Vec2,
	scene: BattlegroundScene,
	pointerDownUnit: { unit: Unit | null }
) {
	const state = getState();

	bgLayer.on(Phaser.Input.Events.POINTER_DOWN,
		(pointer: Phaser.Input.Pointer) => {

			const position = bgLayer.getTileAtWorldXY(pointer.x, pointer.y);

			const maybeUnit = state.gameData.units.find((unit) => eqVec2(unit.position, vec2(position.x, position.y)));

			if (maybeUnit) {
				pointerDownUnit.unit = maybeUnit;
			}

			startScroll.x = scene.cameras.main.scrollX
			startScroll.y = scene.cameras.main.scrollY
		}
	);
}
