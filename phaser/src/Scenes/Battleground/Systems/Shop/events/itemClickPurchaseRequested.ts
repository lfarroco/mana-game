import * as constants from "../../../../../constants/constants";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { updatePlayerGoldIO } from "@Models/Entities/Force";
import { getCharaById, summon } from "@Systems/Chara/Chara";
import * as charaEvents from "@Systems/Chara/events";
import * as uiEvents from "@UI/events";
import * as Geometry from "@Models/Geometry";
import { scene } from "../../../BattlegroundScene";
import * as Board from "@Models/Board";

export function itemClickPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	dragStartX: number,
	dragStartY: number,
): void {

	const { state } = scene;

	const handlePurchaseFailure = (
		reason: string,
		additionalDetails?: Record<string, any>
	) => {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), Geometry.vec2(
			dragStartX,
			dragStartY,
		));

		uiEvents.onPurchaseFailed({
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

	const targetTile = Board.getEmptySlot(
		state.gameData.player.units, constants.FORCE_ID_PLAYER);
	if (!targetTile) {
		handlePurchaseFailure("NO_EMPTY_SLOT");
		return;
	}

	updatePlayerGoldIO(-constants.SHOP_ITEM_PURCHASE_COST);
	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	state.gameData.player.units.push(newUnit);

	summon(newUnit, true);

	charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId))
}