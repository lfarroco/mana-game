import Phaser from "phaser";
import { CharaInputHandler, _handleSellUnit, processOwnedUnitMoveRequest, _handleDropShopItem } from "./CharaInputHandler";
import { vec2 } from "../../../Models/Geometry.pure";
import * as Shop from "../../../Scenes/Battleground/Systems/Shop";
import { getIsShopItem } from "../Chara";
import { getSharedPlayerBoard } from "../../../Models/Board";

export const onDrop = (handlerState: CharaInputHandler) => (_pointer: Phaser.Input.Pointer, dropZoneTarget: Phaser.GameObjects.GameObject): void => {
	handlerState.wasDragSuccessful = processDrop(handlerState)(dropZoneTarget, handlerState.dragStartX, handlerState.dragStartY);
};
const processDrop = (handlerState: CharaInputHandler) => (dropTarget: Phaser.GameObjects.GameObject, dragStartX: number, dragStartY: number): boolean => {
	if (dropTarget.name === Shop.constants.SHOP_SELL_ZONE_NAME) {
		if (!getIsShopItem(handlerState.unitId)) {
			_handleSellUnit(handlerState);
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
