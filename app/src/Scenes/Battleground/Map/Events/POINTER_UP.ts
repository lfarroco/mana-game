import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { issueSkillCommand, issueMoveOrder } from "../makeMapInteractive";
import { Unit } from "../../../../Models/Unit";
import { asVec2, eqVec2 } from "../../../../Models/Geometry";
import { emit, signals } from "../../../../Models/Signals";

export function onPointerUp(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	scene: BattlegroundScene,
	unitPointerDown: { unit: Unit | null }
) {
	bgLayer.on(Phaser.Input.Events.POINTER_UP,
		(pointer: Phaser.Input.Pointer) => {

			const state = getState();

			const tile = bgLayer.getTileAtWorldXY(pointer.worldX, pointer.worldY);

			console.log("clicked tile", tile);

			const isDrag = pointer.downTime > 100 && pointer.getDistance() > 10

			console.log("distance", pointer.getDistance());
			console.log("downtime", pointer.downTime);
			console.log("isDrag?", isDrag);

			if (scene.selectedSkillId) {
				console.log("issuing skill command", scene.selectedSkillId);
				issueSkillCommand(state, scene, tile, scene.selectedSkillId);
				return;
			} else if (unitPointerDown.unit && (isDrag || scene.isSelectingSquadMove)) {

				if (eqVec2(unitPointerDown.unit.position, asVec2(tile))) {

					console.log("select own cell, go idle", unitPointerDown.unit.id);
					emit(signals.MAKE_UNIT_IDLE, unitPointerDown.unit.id);
					return;
				}

				console.log("issuing move order", unitPointerDown.unit.id);

				issueMoveOrder(state,
					unitPointerDown.unit.id,
					tile, scene, pointer.worldX, pointer.worldY);

				// TODO: every state change needs to be done through signals
				unitPointerDown.unit = null;

				return;

			} else {
				unitPointerDown.unit = null;
			}

		}
	);
}
