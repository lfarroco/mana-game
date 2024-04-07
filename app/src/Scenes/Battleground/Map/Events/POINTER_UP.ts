import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { checkAttackTargetInCell, issueSkillCommand, issueMoveOrder, selectEntityInTile } from "../makeMapInteractive";
import { Unit } from "../../../../Models/Unit";
import { asVec2 } from "../../../../Models/Geometry";

export function onPointerUp(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	scene: BattlegroundScene,
	unitPointerDown: { unit: Unit | null }
) {
	bgLayer.on(Phaser.Input.Events.POINTER_UP,
		(pointer: Phaser.Input.Pointer) => {


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

			if (!scene.isSelectingSquadMove && !pointer.rightButtonReleased()) {

				selectEntityInTile(state, asVec2(tile));

				return;
			}

		}
	);
}
