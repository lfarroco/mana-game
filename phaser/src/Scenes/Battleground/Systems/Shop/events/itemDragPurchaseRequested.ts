import { scene } from "../../../BattlegroundScene";
import * as constants from "../../../../../constants/constants";
import { vec2, Vec2 } from "@Models/Geometry";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getUnitAt } from "@Models/State";
import { updatePlayerGoldIO } from "@Models/Entities/Force";
import { getCharaById, summon } from "@Systems/Chara/Chara";
import * as Systems from "@Systems/index"
import * as onPurchaseFailed from "@UI/events/onPurchaseFailed";

export function itemDragPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {

	if (scene.state.gameData.player.gold < constants.SHOP_ITEM_PURCHASE_COST) {

		Systems.Chara.Chara.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
			dragStartX, dragStartY
		));
		onPurchaseFailed.onPurchaseFailed({
			unitName: shopUnitData.name,
			reason: "INSUFFICIENT_GOLD",
			cost: constants.SHOP_ITEM_PURCHASE_COST
		});
		return;
	}
	if (scene.state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		Systems.Chara.Chara.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
			dragStartX, dragStartY
		));
		onPurchaseFailed.onPurchaseFailed({
			unitName: shopUnitData.name,
			reason: "PARTY_FULL"
		});
		return;
	}

	const occupier = getUnitAt(scene.state.gameData.player.units)(targetTile);
	if (occupier) {
		Systems.Chara.Chara.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
			dragStartX, dragStartY
		));
		onPurchaseFailed.onPurchaseFailed({
			unitName: shopUnitData.name,
			reason: "SLOT_OCCUPIED"
		});
		return;
	}

	updatePlayerGoldIO(-constants.SHOP_ITEM_PURCHASE_COST);
	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	scene.state.gameData.player.units.push(newUnit);

	summon(newUnit, true);

	Systems.Chara.Chara.onShopPurchaseSuccesful(getCharaById(shopCharaId))

}