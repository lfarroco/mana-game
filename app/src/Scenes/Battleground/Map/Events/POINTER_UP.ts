import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { checkAttackTargetInCell, issueSkillCommand, issueMoveOrder } from "../makeMapInteractive";
import { Unit } from "../../../../Models/Unit";

export function onPointerUp(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	scene: BattlegroundScene,
	unitPointerDown: { unit: Unit | null }
) {
	bgLayer.on(Phaser.Input.Events.POINTER_UP,
		(pointer: Phaser.Input.Pointer) => {

			const state = getState();

			const tile = bgLayer.getTileAtWorldXY(pointer.worldX, pointer.worldY);

			console.log("clicked on tile", tile);

			if (scene.isSelectingAttackTarget) {

				checkAttackTargetInCell(state, tile);

				return;

			}

			if (scene.selectedSkillId) {
				issueSkillCommand(state, scene, tile, scene.selectedSkillId);
				return;
			}

			if (unitPointerDown.unit && pointer.downTime > 100 && pointer.getDistance() > 10) {

				issueMoveOrder(state,
					unitPointerDown.unit.id,
					tile, scene, pointer.worldX, pointer.worldY);

				unitPointerDown.unit = null;

				return;

			}

		}
	);
}
