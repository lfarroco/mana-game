import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { getState } from "../../../../Models/State";
import { issueSkillCommand, issueMoveOrder } from "../makeMapInteractive";
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

			const isDrag = pointer.downTime > 100 && pointer.getDistance() > 10
			console.log("isDrag", isDrag);

			if (scene.selectedSkillId) {
				console.log("issuing skill command", scene.selectedSkillId);
				issueSkillCommand(state, scene, tile, scene.selectedSkillId);
				return;
			}

			if (
				unitPointerDown.unit && (isDrag || scene.isSelectingSquadMove)
			) {
				console.log("issuing move order", unitPointerDown.unit.id);

				issueMoveOrder(state,
					unitPointerDown.unit.id,
					tile, scene, pointer.worldX, pointer.worldY);

				// TODO: every state change needs to be done through signals
				unitPointerDown.unit = null;

				return;

			}

		}
	);
}
