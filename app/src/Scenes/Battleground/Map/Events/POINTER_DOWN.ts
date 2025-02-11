import Phaser from "phaser";

import { Vec2, asVec2, eqVec2, } from "../../../../Models/Geometry";
import BattlegroundScene from "../../BattlegroundScene";
import { getState, State } from "../../../../Models/State";
import { Unit } from "../../../../Models/Unit";
import { City } from "../../../../Models/City";
import { emit, signals } from "../../../../Models/Signals";


export function onPointerDown(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startScroll: Vec2,
	scene: BattlegroundScene,
	pointerDownUnit: { unit: Unit | null }
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

export function selectEntityInTile(state: State, tile: Vec2): [Unit | undefined, City | undefined] {
	const unit = state.gameData.units
		.filter(u => u.hp > 0)
		.find((unit) => eqVec2(unit.position, (tile)));

	const city = state.gameData.cities.find((city) => eqVec2(city.boardPosition, (tile)));

	if (unit) {
		emit(signals.UNIT_SELECTED, unit.id);
	} else {
		if (city) {
			emit(signals.CITY_SELECTED, city.id);
		}
	}

	return [unit, city]
}