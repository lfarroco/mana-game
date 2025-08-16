import { BattlegroundScene } from "../../../BattlegroundScene";
import * as constants from "../../../../../constants/constants";
import { Vec2 } from "../../../../../Models/Geometry";
import { makeUnit, Unit } from "../../../../../Models/Entities/Unit";
import { getUnitAt } from "../../../../../Models/State";
import { updatePlayerGoldIO } from "../../../../../Models/Entities/Force";
import { getChara, summonChara } from "../../CharaManager";
import { ui } from "../../../../../UI/UIManager";

export function shopItemDragPurchaseRequestedHandler(
	scene: BattlegroundScene,
	payload: { shopUnitData: Unit, shopCharaId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }
): void {
	const { shopUnitData, shopCharaId, targetTile, dragStartX, dragStartY } = payload;

	if (scene.state.gameData.player.gold < constants.SHOP_ITEM_PURCHASE_COST) {

		getChara(shopCharaId).onShopPurchaseFailed({
			reason: "INSUFFICIENT_GOLD",
			originalShopCharaId: shopCharaId,
			dragStartX, dragStartY
		});
		ui.handlePurchaseFailed({
			unitName: shopUnitData.name,
			reason: "INSUFFICIENT_GOLD",
			cost: constants.SHOP_ITEM_PURCHASE_COST
		});
		return;
	}
	if (scene.state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		getChara(shopCharaId).onShopPurchaseFailed({
			reason: "PARTY_FULL",
			originalShopCharaId: shopCharaId,
			dragStartX, dragStartY
		});
		ui.handlePurchaseFailed({
			unitName: shopUnitData.name,
			reason: "PARTY_FULL"
		});
		return;
	}

	const occupier = getUnitAt(scene.state.gameData.player.units)(targetTile);
	if (occupier) {
		getChara(shopCharaId).onShopPurchaseFailed({
			reason: "SLOT_OCCUPIED",
			originalShopCharaId: shopCharaId,
			dragStartX, dragStartY
		});
		ui.handlePurchaseFailed({
			unitName: shopUnitData.name,
			reason: "SLOT_OCCUPIED"
		});
		return;
	}

	updatePlayerGoldIO(-constants.SHOP_ITEM_PURCHASE_COST);
	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	scene.state.gameData.player.units.push(newUnit);

	summonChara(newUnit, true);

	getChara(shopCharaId).onShopPurchaseSuccesful()

}