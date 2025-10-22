import { SHOP_ITEM_PURCHASE_COST } from "@Constants/constants"
import * as Chara from "./Chara";
import { hideTooltip } from "@UI/Tooltip";
import { tween } from "../../Utils/animation";
import { playSoundEffect } from "@Systems/AudioManager";
import * as Shop from "@Scenes/Battleground/Systems/Shop";

export const onSell = (unitId: string) => {
	const sellPrice = Math.floor(SHOP_ITEM_PURCHASE_COST / 2);
	Shop.events.ownedUnitSold(unitId, sellPrice);
};

export const onShopPurchaseFailed = (chara: Chara.Chara, vec: Vec2) => {
	hideTooltip();
	tween({
		targets: [chara],
		...vec,
		duration: 150,
	});
};

export function onShopPurchaseSuccesful(chara: Chara.Chara) {
	hideTooltip();

	Shop.UI.removeShopChild(chara);

	Shop.HeroShop.handleCharaPurchaseFinalized(chara);

	playSoundEffect('sfx_artifact_equipweapon');

	Chara.destroy(chara);
}