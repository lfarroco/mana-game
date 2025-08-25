import Phaser from "phaser";
import { vec2 } from "../../../Models/Geometry.pure";
import { scene } from "../../../Scenes/Battleground/BattlegroundScene";
import * as Shop from "../../../Scenes/Battleground/Systems/Shop";
import { hideTooltip } from "../../../UI/Tooltip";
import { tween } from "../../../Utils/animation";
import { getIsShopItem } from "../Chara";
import { InputHandler } from ".";

export const onDragStart = (handlerState: InputHandler) => (
	_pointer: Phaser.Input.Pointer,
	_dragX: number,
	_dragY: number
) => {
	const { chara, dragStartX, dragStartY } = handlerState;
	handlerState.dragStartX = chara.x;
	handlerState.dragStartY = chara.y;
	handlerState.dragStartVec = vec2(dragStartX, dragStartY);
	handlerState.wasDragSuccessful = false;

	if (getIsShopItem(handlerState.unitId)) {
		Shop.UI.bringShopChildToTop(chara);
	} else {
		scene.children.bringToTop(chara);
	}

	tween({
		targets: [chara],
		angle: -10,
		duration: 100,
		ease: "Cubic.Out",
	});

	if (!getIsShopItem(handlerState.unitId)) {
		Shop.UI.showSellZone();
	}

	hideTooltip();
};
