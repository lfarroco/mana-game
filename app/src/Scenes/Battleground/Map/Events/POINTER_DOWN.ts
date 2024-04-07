import Phaser from "phaser";

import { Vec2, eqVec2, vec2 } from "../../../../Models/Geometry";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { Unit } from "../../../../Models/Unit";


export function onPointerDown(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startDrag: Vec2,
	startScroll: Vec2,
	scene: BattlegroundScene,
	pointerDownUnit: { unit: Unit | null }
) {
	const state = getState();

	bgLayer.on(Phaser.Input.Events.POINTER_DOWN,
		(pointer: Phaser.Input.Pointer) => {
			startDrag = vec2(pointer.x, pointer.y);

			const position = bgLayer.getTileAtWorldXY(pointer.x, pointer.y);

			console.log("pos::: ", position.x, position.y)
			const maybeUnit = state.gameData.units.find((unit) => eqVec2(unit.position, vec2(position.x, position.y)));

			console.log(maybeUnit)
			if (maybeUnit) {
				console.log("unit found!!!")
				pointerDownUnit.unit = maybeUnit;
			}

			startScroll = vec2(
				scene.cameras.main.scrollX,
				scene.cameras.main.scrollY
			);
		}
	);
}
