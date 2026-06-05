import * as Chara from "@Systems/Chara/Chara";
import { hideTooltip } from "@Components/Tooltip/Tooltip";
import { tween } from "@Utils/animation";
import { playSoundEffect } from "@Systems/AudioManager";

const PURCHASE_FAILED_SNAP_DURATION_MS = 150;

export const onShopPurchaseFailed = (chara: Chara.Chara, vec: Vec2) => {
	hideTooltip();
	tween({
		targets: [chara],
		...vec,
		duration: PURCHASE_FAILED_SNAP_DURATION_MS,
	});
};

export const onShopPurchaseSuccesful = (chara: Chara.Chara) => {
	hideTooltip();
	playSoundEffect("sfx_artifact_equipweapon");
	const state = Chara.mustGetState(chara);
	chara.emit("chara:purchaseSuccessful", state.unit);
};
