import { scene } from "../../../BattlegroundScene";
import * as constants from "../../../../../Constants/constants";
import { vec2 } from "@Models/Geometry";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getUnitAt } from "@Models/State";
import { getCharaById, summon, updateUnitPower } from "@Systems/Chara/Chara";
import * as uiEvents from "@UI/events";
import * as charaEvents from "@Systems/Chara/events";
import * as Systems from "../../index";
import * as ShopUI from "../ShopUI";
import * as HeroShop from "../HeroShop";

export function itemDragPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {
	const existingUnit = scene.state.gameData.player.units.find(u => u.cardId === shopUnitData.cardId);

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

	if (scene.state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
			dragStartX, dragStartY
		));
		uiEvents.onPurchaseFailed(
			shopUnitData.name,
			"PARTY_FULL"
		);
		return;
	}

	const occupier = getUnitAt(scene.state.gameData.player.units)(targetTile);
	if (occupier) {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
			dragStartX, dragStartY
		));
		uiEvents.onPurchaseFailed(
			shopUnitData.name,
			"SLOT_OCCUPIED"
		);
		return;
	}

	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	scene.state.gameData.player.units.push(newUnit);

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