import { SHOP_ITEM_PURCHASE_COST } from "../../constants/constants"
import * as Chara from "./Chara";
import { hideTooltip } from "@UI/Tooltip";
import { tween } from "../../Utils/animation";
import { playSoundEffect } from "@Systems/AudioManager";
import * as Shop from "@Scenes/Battleground/Systems/Shop";

const onSell = (chara: Chara.Chara) => {
	const sellPrice = Math.floor(SHOP_ITEM_PURCHASE_COST / 2);
	Shop.events.ownedUnitSold(Chara.getUnit(chara).id, sellPrice);
};

const onShopPurchaseFailed = (chara: Chara.Chara, vec: Vec2) => {
	hideTooltip();
	tween({
		targets: [chara],
		...vec,
		duration: 150,
	});
};

function onShopPurchaseSuccesful(chara: Chara.Chara) {
	hideTooltip();

	Shop.UI.removeShopChild(chara);

	Shop.Shop.handleCharaPurchaseFinalized(chara);

	playSoundEffect('sfx_artifact_equipweapon');

	Chara.destroy(chara);
}


export default {
	onSell,
	onShopPurchaseFailed,
	onShopPurchaseSuccesful
}