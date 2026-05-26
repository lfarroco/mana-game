import * as Chara from "@Systems/Chara/Chara";
import { hideTooltip } from "@Components/Tooltip";
import { tween } from "@Utils/animation";
import { playSoundEffect } from "@Systems/AudioManager";
import * as Shop from "@Systems/Shop";

// Chara event animation durations
const PURCHASE_FAILED_SNAP_DURATION_MS = 150;

export const onDiscard = (unitId: string) => {
	Shop.events.ownedUnitSold(unitId);
};

export const onShopPurchaseFailed = (chara: Chara.Chara, vec: Vec2) => {
	hideTooltip();
	tween({
		targets: [chara],
		...vec,
		duration: PURCHASE_FAILED_SNAP_DURATION_MS,
	});
};

export function onShopPurchaseSuccesful(chara: Chara.Chara) {
	hideTooltip();
	playSoundEffect("sfx_artifact_equipweapon");
	const state = Chara.mustGetState(chara);
	chara.emit("chara:purchaseSuccessful", state.unit);
}
