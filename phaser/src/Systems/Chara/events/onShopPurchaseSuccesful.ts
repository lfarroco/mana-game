import * as Shop from "@Scenes/Battleground/Systems/Shop/Shop";
import * as ShopUI from "@Scenes/Battleground/Systems/Shop/ShopUI";
import { playSoundEffect } from "@Systems/AudioManager";
import { hideTooltip } from "@UI/Tooltip";
import { Chara, destroy } from "../Chara";


export function onShopPurchaseSuccesful(chara: Chara): void {
	hideTooltip();

	ShopUI.removeShopChild(chara);

	Shop.handleCharaPurchaseFinalized(chara);

	playSoundEffect('sfx_artifact_equipweapon');

	// Remove the shop item instance from display and registry
	destroy(chara);
}
