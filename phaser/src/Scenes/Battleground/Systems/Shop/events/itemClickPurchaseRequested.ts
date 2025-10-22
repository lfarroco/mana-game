import * as constants from "../../../../../constants/constants";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getCharaById, summon, updateUnitPower } from "@Systems/Chara/Chara";
import * as charaEvents from "@Systems/Chara/events";
import * as uiEvents from "@UI/events";
import * as Geometry from "@Models/Geometry";
import { scene } from "../../../BattlegroundScene";
import * as Board from "@Models/Board";
import * as Systems from "../../index";
import * as ShopUI from "../ShopUI";
import * as HeroShop from "../HeroShop";

export function itemClickPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	dragStartX: number,
	dragStartY: number,
): void {

	const { state } = scene;

	const handlePurchaseFailure = (
		reason: string,
		cost?: number
	) => {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), Geometry.vec2(
			dragStartX,
			dragStartY,
		));

		uiEvents.onPurchaseFailed(
			shopUnitData.name,
			reason,
			cost
		);
	};

	const existingUnit = state.gameData.player.units.find(u => u.cardId === shopUnitData.cardId);

	if (existingUnit) {
		// Fuse: add power to existing unit
		const chara = getCharaById(existingUnit.id);
		updateUnitPower(chara, shopUnitData.power);

		charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

		// Refresh all heroes in the shop after purchase
		HeroShop.rerollTavern();

		// Check if we should close the shop after this purchase
		const shouldCloseShop = Systems.ShopPhase.handleHeroPurchase();

		if (shouldCloseShop) {
			// Move to next phase after placing hero (same as next round button)
			Systems.ShopPhase.handleShopPhaseEnded();
			ShopUI.close();
		}
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

	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	state.gameData.player.units.push(newUnit);

	summon(newUnit, true);

	charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

	// Refresh all heroes in the shop after purchase
	HeroShop.rerollTavern();

	// Check if we should close the shop after this purchase
	const shouldCloseShop = Systems.ShopPhase.handleHeroPurchase();

	if (shouldCloseShop) {
		// Move to next phase after placing hero (same as next round button)
		Systems.ShopPhase.handleShopPhaseEnded();
		ShopUI.close();
	}
	// If shouldCloseShop is false, the shop stays open for more purchases
}