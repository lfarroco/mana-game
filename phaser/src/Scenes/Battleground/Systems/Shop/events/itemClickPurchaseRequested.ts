import * as constants from "../../../../../constants/constants";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { updatePlayerGoldIO } from "@Models/Entities/Force";
import { getCharaById, summon } from "@Systems/Chara/Chara";
import * as Chara from "@Systems/Chara/Chara";
import * as onPurchaseFailed from "@UI/events/onPurchaseFailed";
import { vec2 } from "@Models/Geometry.pure";
import { scene } from "../../../BattlegroundScene";

export function itemClickPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	dragStartX: number,
	dragStartY: number,
): void {

	const { state, playerBoard } = scene;

	const handlePurchaseFailure = (
		reason: string,
		additionalDetails?: Record<string, any>
	) => {
		Chara.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
			dragStartX,
			dragStartY,
		));

		onPurchaseFailed.onPurchaseFailed({
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

	summon(newUnit, true);

	Chara.onShopPurchaseSuccesful(getCharaById(shopCharaId))
}