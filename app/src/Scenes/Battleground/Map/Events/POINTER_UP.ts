import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { checkAttackTargetInCell, issueSkillCommand, issueMoveOrder, selectEntityInTile } from "../makeMapInteractive";

export function onPointerUp(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	scene: BattlegroundScene,
) {
	bgLayer.on(Phaser.Input.Events.POINTER_UP,
		(pointer: Phaser.Input.Pointer, x: number, y: number) => {

			// releasing the pointer after a drag also triggers a pointer up event, so we check the distance
			if (pointer.getDistance() > 10) return;

			const state = getState();

			const tile = bgLayer.getTileAtWorldXY(x, y);

			if (scene.isSelectingAttackTarget) {

				checkAttackTargetInCell(state, tile);

				return;

			}

			if (scene.selectedSkillId) {
				issueSkillCommand(state, scene, tile, scene.selectedSkillId);
				return;
			}

			if (pointer.rightButtonReleased() || scene.isSelectingSquadMove) {

				issueMoveOrder(state, tile, scene, x, y);

				return;

			}

			if (!scene.isSelectingSquadMove && !pointer.rightButtonReleased()) {

				selectEntityInTile(state, tile);

				return;
			}

		}
	);
}
