import Phaser from "phaser";
import { scene } from "../../../Scenes/Battleground/BattlegroundScene";
import * as Shop from "../../../Scenes/Battleground/Systems/Shop";
import { tween } from "../../../Utils/animation";
import { getIsShopItem } from "../Chara";
import { InputHandler } from ".";

export const onDragEnd = (handlerState: InputHandler) => (_pointer: Phaser.Input.Pointer): void => {
	const { chara } = handlerState;
	scene.tweens.add({
		targets: [handlerState.chara],
		angle: 0,
		duration: 100,
		ease: "Cubic.Out",
	});

	if (!getIsShopItem(handlerState.unitId)) {
		Shop.UI.hideSellZone();
	}

	if (!handlerState.wasDragSuccessful) {
		tween({
			targets: [chara],
			...handlerState.dragStartVec,
			duration: 150,
		});
	}

	handlerState.wasDragSuccessful = false;
};
