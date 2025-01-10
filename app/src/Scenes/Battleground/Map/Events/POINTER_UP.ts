import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { checkAttackTargetInCell, issueSkillCommand, issueMoveOrder } from "../makeMapInteractive";
import { Unit } from "../../../../Models/Unit";
import { Vec2 } from "../../../../Models/Geometry";

export function onPointerUp(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	startDrag: Vec2,
	scene: BattlegroundScene,
	unitPointerDown: { unit: Unit | null }
) {
	bgLayer.on(Phaser.Input.Events.POINTER_UP,
		(pointer: Phaser.Input.Pointer) => {

			startDrag.x = -1;
			startDrag.y = -1;

			const state = getState();

			const tile = bgLayer.getTileAtWorldXY(pointer.x, pointer.y);

			if (scene.isSelectingAttackTarget) {

				checkAttackTargetInCell(state, tile);

				return;

			}

			if (scene.selectedSkillId) {
				issueSkillCommand(state, scene, tile, scene.selectedSkillId);
				return;
			}

			if (unitPointerDown.unit) {

				issueMoveOrder(state,
					unitPointerDown.unit.id,
					tile, scene, pointer.x, pointer.y);

				unitPointerDown.unit = null;

				return;

			}

		}
	);
}
