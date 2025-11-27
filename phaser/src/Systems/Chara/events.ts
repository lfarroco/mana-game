import * as Chara from "./Chara";
import { hideTooltip } from "@Components/Tooltip";
import { tween } from "@Utils/animation";
import { playSoundEffect } from "@Systems/AudioManager";
import * as Shop from "@Scenes/Battleground/Systems/Shop";

export const onDiscard = (unitId: string) => {
	Shop.events.ownedUnitSold(unitId);
};

export const onShopPurchaseFailed = (chara: Chara.Chara, vec: Vec2) => {
	hideTooltip();
	tween({
		targets: [chara],
		...vec,
		duration: 150,
	});
};

export function onShopPurchaseSuccesful(_chara: Chara.Chara) {
	hideTooltip();
	playSoundEffect("sfx_artifact_equipweapon");
}
