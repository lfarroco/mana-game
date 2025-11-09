import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getUnitAt } from "@Models/State";
import { getCharaById, summon, upgrade } from "@Systems/Chara/Chara";
import * as uiEvents from "@UI/events";
import * as charaEvents from "@Systems/Chara/events";
import * as ShopUI from "../ShopPanel";
import * as PhaseManager from "@Scenes/Battleground/PhaseManager";

export async function itemDragPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {
	const existingUnit = state.gameData.player.units.find(u => u.cardId === shopUnitData.cardId);

	if (existingUnit && existingUnit.rank < 3) {

		upgrade(existingUnit)

		charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

		await ShopUI.slideOut();

		PhaseManager.handlePhaseEnded();
		return;
	}

	if (state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
			dragStartX, dragStartY
		));
		uiEvents.onPurchaseFailed(
			shopUnitData.name,
			"PARTY_FULL"
		);
		return;
	}

	const occupier = getUnitAt(state.gameData.player.units)(targetTile);
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
	state.gameData.player.units.push(newUnit);

	summon(newUnit, true);

	charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

	await ShopUI.slideOut()
	PhaseManager.handlePhaseEnded();
}