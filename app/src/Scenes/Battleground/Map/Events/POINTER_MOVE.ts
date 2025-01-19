import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { asVec2, eqVec2_, vec2, Vec2 } from "../../../../Models/Geometry";
import { Unit } from "../../../../Models/Unit";
import { emit, signals } from "../../../../Models/Signals";
import { FORCE_ID_PLAYER } from "../../../../Models/Force";
import { getJob } from "../../../../Models/Job";
import { highlightCells } from "../highlightCells";

export function onPointerMove(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startScroll: Vec2,
	scene: BattlegroundScene,
	pointerDownUnit: { unit: Unit | null }
) {

	bgLayer.on(Phaser.Input.Events.POINTER_MOVE,
		(pointer: Phaser.Input.Pointer) => {

			if (!pointer.isDown) return;
			if (pointer.downTime < 100) return;

			const dx = pointer.downX - pointer.x;
			const dy = pointer.downY - pointer.y;

			if ((Math.abs(dx) + Math.abs(dy)) < 10) return;

			if (pointerDownUnit.unit && pointerDownUnit.unit.force === FORCE_ID_PLAYER) {

				// cell manhattan distance to the pointer
				const tile = scene.getTileAtWorldXY(vec2(
					pointer.x + scene.cameras.main.scrollX, pointer.y + scene.cameras.main.scrollY));

				const distance = Phaser.Math.Distance.Snake(
					tile.x, tile.y,
					pointerDownUnit.unit.position.x, pointerDownUnit.unit.position.y,
				)

				const moveRange = getJob(pointerDownUnit.unit.job).moveRange

				if (distance > moveRange) return;


				const vec = asVec2(tile);
				const path = pointerDownUnit.unit.order.type === "move" ? pointerDownUnit.unit.order.path : [];

				highlightCells(scene, vec, moveRange - path.length)

				if (distance < 1 && path.length > 0) {
					emit(signals.PATH_FOUND, pointerDownUnit.unit.id, []);
					return;
				} else if (distance < 1) {
					return
				}

				if (!path.some(eqVec2_(vec))) {

					if (path.length === moveRange) return
					const newPath = path.concat([vec]);
					emit(signals.PATH_FOUND, pointerDownUnit.unit.id, newPath);

				} else {

					const idx = path.findIndex(eqVec2_(vec))
					// if it is the last index, do nothing
					// remove cells after the current cell

					if (idx === path.length - 1) {
						return
					}
					const slicedPath = path.slice(0, idx + 1);
					emit(signals.PATH_FOUND, pointerDownUnit.unit.id, slicedPath);
				}

			} else {

				// dragging the camera is only allowed if the pointer was not pressed over a unit

				scene.cameras.main.scrollX = startScroll.x + dx;
				scene.cameras.main.scrollY = startScroll.y + dy;
			}
		}
	);

}
