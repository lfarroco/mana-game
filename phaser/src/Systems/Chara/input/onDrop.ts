import Phaser from "phaser";
import * as events from "../events";
import { Vec2, vec2 } from "../../../Models/Geometry.pure";
import * as Shop from "../../../Scenes/Battleground/Systems/Shop";
import { getCharaById, getCharaPosition, getIsShopItem, getUnit } from "../Chara";
import { getSharedPlayerBoard, PartyBoard } from "../../../Models/Board";
import { scene } from "../../../Scenes/Battleground/BattlegroundScene";
import { Unit } from "../../../Models/Entities/Unit";
import { hideTooltip } from "../../../UI/Tooltip";
import { tween } from "../../../Utils/animation";
import * as input from "./index"

export const onDrop = (handlerState: input.InputHandler) =>
	(_pointer: Phaser.Input.Pointer, dropZoneTarget: Phaser.GameObjects.GameObject): void => {
		handlerState.wasDragSuccessful = processDrop(handlerState)(dropZoneTarget, handlerState.dragStartX, handlerState.dragStartY);
	};

const processDrop = (handlerState: input.InputHandler) =>
	(dropTarget: Phaser.GameObjects.GameObject, dragStartX: number, dragStartY: number): boolean => {
		if (dropTarget.name === Shop.constants.SHOP_SELL_ZONE_NAME) {
			if (!getIsShopItem(handlerState.unitId)) {
				events.onSell(handlerState.chara);
				return true;
			} else {
				return false;
			}
		}

		const playerBoard = getSharedPlayerBoard();
		if (!playerBoard) {
			console.warn("CharaInputHandler.processDrop: No shared player board instance.");
			return false;
		}
		const slotIndex = playerBoard.dropZones.indexOf(dropTarget as Phaser.GameObjects.Zone);
		if (slotIndex === -1) {
			return false;
		}
		const tileX = slotIndex % 3;
		const tileY = Math.floor(slotIndex / 3);
		const tile = vec2(tileX, tileY);

		if (!getIsShopItem(handlerState.unitId)) {
			processOwnedUnitMoveRequest(handlerState.unitId, tile, dragStartX, dragStartY);
			return true;
		} else {
			_handleDropShopItem(handlerState)(tile, dragStartX, dragStartY);
			return true;
		}
	};

const _handleDropShopItem = (handlerState: input.InputHandler) => (tile: Vec2, dragStartX: number, dragStartY: number) => {
	const { chara } = handlerState
	Shop.events.itemDragPurchaseRequested(
		{ ...getUnit(chara) },
		getUnit(chara).id,
		tile,
		dragStartX,
		dragStartY
	);
}

export const processOwnedUnitMoveRequest = (
	unitId: string, targetTile: Vec2, dragStartX: number, dragStartY: number
) => {
	const units = scene.state.gameData.player.units;
	const unit = units.find(u => u.id === unitId);
	if (!unit) {
		_movementRejected(unitId, dragStartX, dragStartY, "UNIT_NOT_FOUND");
		return;
	}
	if (unit.position.x === targetTile.x && unit.position.y === targetTile.y) {
		_movementRejected(unitId, dragStartX, dragStartY, "NO_OP");
		return;
	}
	const occupier = units.find(u => u.id !== unitId && u.position.x === targetTile.x && u.position.y === targetTile.y);
	if (occupier) {
		_executeSwap(unit, occupier, targetTile, units);
		return;
	}
	_executeMove(unit, targetTile, units);
};
const _executeMove = (unit: Unit, target: Vec2, units: Unit[]) => {
	const result = PartyBoard.updateUnitPosition(unit, target, units);
	if (!result) return;
	_applyMoveVisual(result.movedUnit);
};
const _executeSwap = (unit: Unit, _occupier: Unit, target: Vec2, units: Unit[]) => {
	const result = PartyBoard.updateUnitPosition(unit, target, units);
	if (!result) return;
	_applySwapVisual(result.movedUnit, result.swappedUnit!);
};
const _applyMoveVisual = (movedUnit: Unit) => {
	const movedChara = getCharaById(movedUnit.id);
	const pos = getCharaPosition(movedUnit);
	tween({
		targets: [movedChara],
		...pos
	});
};
const _applySwapVisual = (movedUnit: Unit, swappedUnit: Unit) => {
	const movedChara = getCharaById(movedUnit.id);
	const swappedChara = getCharaById(swappedUnit.id);
	const movedPos = getCharaPosition(movedUnit);
	const swappedPos = getCharaPosition(swappedUnit);
	tween({ targets: [movedChara], ...movedPos });
	tween({ targets: [swappedChara], ...swappedPos });
};
const _movementRejected = (unitId: string, dragStartX: number, dragStartY: number, _reason: string) => {
	const failedChara = getCharaById(unitId);
	hideTooltip();
	tween({ targets: [failedChara], ...vec2(dragStartX, dragStartY) });
};
