import Phaser from "phaser";
import BattlegroundScene from "../../BattlegroundScene";
import { getState, getUnit } from "../../../../Models/State";
import { issueSkillCommand } from "../makeMapInteractive";
import { Unit } from "../../../../Models/Unit";
import { asVec2, eqVec2 } from "../../../../Models/Geometry";
import { emit, signals } from "../../../../Models/Signals";
import { pingAtLocation } from "../Ping";
import { FORCE_ID_PLAYER } from "../../../../Models/Force";

export function onPointerUp(
	bgLayer: Phaser.Tilemaps.TilemapLayer,
	scene: BattlegroundScene,
	unitPointerDown: { unit: Unit | null }
) {
	bgLayer.on(Phaser.Input.Events.POINTER_UP,
		(pointer: Phaser.Input.Pointer) => {

			const state = getState();

			if (state.inputDisabled) {
				return;
			}

			const tile = bgLayer.getTileAtWorldXY(pointer.worldX, pointer.worldY);

			console.log("clicked tile", tile);

			const isDrag = pointer.downTime > 100 && pointer.getDistance() > 10

			console.log("distance", pointer.getDistance());
			console.log("downtime", pointer.downTime);
			console.log("isDrag?", isDrag);


			if (scene.isSelectingSquadMove && state.gameData.selectedUnit) {

				const maybeSelectedUnit = getUnit(state)(state.gameData.selectedUnit);

				if (!maybeSelectedUnit) return;

				maybeSelectedUnit.order = {
					type: "move",
					cell: asVec2(tile),
				}
				emit(signals.SELECT_UNIT_MOVE_DONE, [maybeSelectedUnit.id], asVec2(tile));
				console.log("squad move: ", tile);
				return;
			}

			if (scene.selectedSkillId) {
				console.log("issuing skill command", scene.selectedSkillId);
				const casted = issueSkillCommand(scene,
					state.gameData.selectedUnit!,
					tile,
					scene.selectedSkillId,
				);

				if (casted) {
					pingAtLocation(scene, tile.x, tile.y);
					emit(signals.DISPLAY_EMOTE, state.gameData.selectedUnit!, "magic-emote");
				}
				return;
			} else if (unitPointerDown.unit && (isDrag)) {

				if (unitPointerDown.unit.force !== FORCE_ID_PLAYER) {
					console.log("select enemy unit, stop pointer up events ", unitPointerDown.unit.job);
					return;
				}

				if (eqVec2(unitPointerDown.unit.position, asVec2(tile))) {

					console.log("select own cell, go idle", unitPointerDown.unit.id);
					emit(signals.MAKE_UNIT_IDLE, unitPointerDown.unit.id);
					emit(signals.DISPLAY_EMOTE, unitPointerDown.unit.id, "question-emote");
					return;
				}

				console.log("issuing move order", unitPointerDown.unit.id);

				pingAtLocation(scene, tile.x, tile.y);

				unitPointerDown.unit.order = {
					type: "move",
					cell: asVec2(tile),
				}

				emit(signals.SELECT_UNIT_MOVE_DONE, [unitPointerDown.unit.id], asVec2(tile));

				// TODO: every state change needs to be done through signals
				unitPointerDown.unit = null;

				return;

			} else {
				unitPointerDown.unit = null;
			}

		}
	);
}
