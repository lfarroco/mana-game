import { BattlegroundScene } from "../../../BattlegroundScene";
import { GameEvents } from "../../../../../constants/events";
import * as constants from "../../../../../constants/constants";
import { Vec2 } from "../../../../../Models/Geometry";
import { makeUnit, Unit } from "../../../../../Models/Entities/Unit";
import { getUnitAt } from "../../../../../Models/State";

export function shopItemDragPurchaseRequestedHandler(
	scene: BattlegroundScene,
	payload: { shopUnitData: Unit, shopCharaId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }
): void {
	const { shopUnitData, shopCharaId, targetTile, dragStartX, dragStartY } = payload;

	if (scene.state.gameData.player.gold < constants.SHOP_ITEM_PURCHASE_COST) {
		scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "INSUFFICIENT_GOLD", dragStartX, dragStartY });
		scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "INSUFFICIENT_GOLD", cost: constants.SHOP_ITEM_PURCHASE_COST });
		return;
	}
	if (scene.state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "PARTY_FULL", dragStartX, dragStartY });
		scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "PARTY_FULL" });
		return;
	}

	const occupier = getUnitAt(scene.state.gameData.player.units)(targetTile);
	if (occupier) {
		scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "SLOT_OCCUPIED", dragStartX, dragStartY });
		scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "SLOT_OCCUPIED" });
		return;
	}

	scene.events.emit(GameEvents.PLAYER_GOLD_UPDATE_REQUEST, -constants.SHOP_ITEM_PURCHASE_COST);
	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	scene.state.gameData.player.units.push(newUnit);
	scene.events.emit(GameEvents.BOARD_CHARA_CREATE_REQUESTED, { unit: newUnit });
	scene.events.emit(GameEvents.SHOP_PURCHASE_SUCCESSFUL, { purchasedUnit: newUnit, originalShopCharaId: shopCharaId });
}