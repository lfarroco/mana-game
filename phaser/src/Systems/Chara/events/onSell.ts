import { SHOP_ITEM_PURCHASE_COST } from "../../../constants/constants";
import * as Shop from "../../../Scenes/Battleground/Systems/Shop";
import { Chara, getUnit } from "../Chara";

export const onSell = (chara: Chara): void => {
	const sellPrice = Math.floor(SHOP_ITEM_PURCHASE_COST / 2);
	Shop.events.ownedUnitSold(getUnit(chara).id, sellPrice);
};
