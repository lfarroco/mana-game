import { getIsShopItem } from "../Chara";
import { CharaInputHandler, processShopItemClick } from "./CharaInputHandler";
import { DRAG_CLICK_THRESHOLD } from "../../../constants/constants";

export const onPointerUpShopItem = (handlerState: CharaInputHandler) => (pointer: Phaser.Input.Pointer): void => {
	if (!getIsShopItem(handlerState.unitId) || !handlerState.chara.input?.enabled) return;

	if (pointer.getDistance() > DRAG_CLICK_THRESHOLD) {
		return;
	}

	processShopItemClick(handlerState)(pointer.x, pointer.y);
};
