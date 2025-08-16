import { BattlegroundScene } from "../../../BattlegroundScene";
import * as constants from "../../../../../constants/constants";
import { makeUnit, Unit } from "../../../../../Models/Entities/Unit";
import { updatePlayerGoldIO } from "../../../../../Models/Entities/Force";
import { getChara, summonChara } from "../../CharaManager";
import { ui } from "../../../../../UI/UIManager";

type ShopItemClickPurchasePayload = {
	shopUnitData: Unit;
	shopCharaId: string;
	dragStartX: number;
	dragStartY: number;
};

/**
 * An attempt on purchasing a unit from the shop
 */
export function shopItemClickPurchaseRequestedHandler(
	scene: BattlegroundScene,
	payload: ShopItemClickPurchasePayload
): void {
	const { state, playerBoard } = scene;
	const { shopUnitData, shopCharaId, dragStartX, dragStartY } = payload;

	// Helper function to handle and emit events for purchase failures.
	const handlePurchaseFailure = (
		reason: string,
		additionalDetails?: Record<string, any>
	) => {
		getChara(shopCharaId).onShopPurchaseFailed({
			reason,
			originalShopCharaId: shopCharaId,
			dragStartX,
			dragStartY,
		});

		ui.handlePurchaseFailed({
			unitName: shopUnitData.name,
			reason,
			...additionalDetails,
		});
	};

	if (state.gameData.player.gold < constants.SHOP_ITEM_PURCHASE_COST) {
		handlePurchaseFailure("INSUFFICIENT_GOLD", { cost: constants.SHOP_ITEM_PURCHASE_COST });
		return;
	}
	if (state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		handlePurchaseFailure("PARTY_FULL");
		return;
	}

	const targetTile = playerBoard.getEmptySlot(state.gameData.player.units, constants.FORCE_ID_PLAYER);
	if (!targetTile) {
		handlePurchaseFailure("NO_EMPTY_SLOT");
		return;
	}

	updatePlayerGoldIO(-constants.SHOP_ITEM_PURCHASE_COST);
	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	state.gameData.player.units.push(newUnit);

	summonChara(newUnit, true);

	getChara(shopCharaId)._onShopPurchaseSuccessful({
		purchasedUnit: newUnit,
		originalShopCharaId: shopCharaId
	})
}