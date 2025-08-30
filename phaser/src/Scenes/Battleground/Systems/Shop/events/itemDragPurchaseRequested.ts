import { scene } from "../../../BattlegroundScene";
import * as constants from "../../../../../constants/constants";
import { vec2 } from "@Models/Geometry";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getUnitAt } from "@Models/State";
import { updatePlayerGoldIO } from "@Models/Entities/Force";
import { getCharaById, summon } from "@Systems/Chara/Chara";
import * as onPurchaseFailed from "@UI/events/onPurchaseFailed";
import events from "@Systems/Chara/events";

export function itemDragPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {

	if (scene.state.gameData.player.gold < constants.SHOP_ITEM_PURCHASE_COST) {

		events.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
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
		events.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
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
		events.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
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

	events.onShopPurchaseSuccesful(getCharaById(shopCharaId));

}