import { getIsShopItem, getUnit } from "../Chara";
import { InputHandler } from ".";
import { DRAG_CLICK_THRESHOLD } from "../../../constants/constants";
import { itemClickPurchaseRequested } from "../../../Scenes/Battleground/Systems/Shop/events";

export const onPointerUpShopItem = (handlerState: InputHandler) => (pointer: Pointer): void => {
	if (!getIsShopItem(handlerState.unitId) || !handlerState.chara.input?.enabled) return;

	if (pointer.getDistance() > DRAG_CLICK_THRESHOLD) {
		return;
	}

	processShopItemClick(handlerState)(pointer.x, pointer.y);
};

const processShopItemClick = (handlerState: InputHandler) => (_clickX: number, _clickY: number): void => {
	const { chara, unitId } = handlerState;
	itemClickPurchaseRequested(
		{ ...getUnit(chara) },
		unitId,
		chara.x,
		chara.y
	);
}