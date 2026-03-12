import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getState, getUnitAt } from "@Models/State";
import { getCharaById, summon, upgradeUnit } from "@Systems/Chara/Chara";
import * as uiEvents from "@UI/events";
import * as charaEvents from "@Systems/Chara/events";
import * as ShopUI from "@Systems/Shop/ShopPanel";
import { getGameController } from "@Core/GameControllerFactory";
import { getName } from "@i18n/i18n";

export async function itemDragPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {
	const existingUnit = getState().session.team.units.find((u) => u.cardId === shopUnitData.cardId);

	// Validate before purchase - party full check (only if not an upgrade)
	if (
		(!existingUnit || existingUnit.rank > 3) &&
		getState().session.team.units.length >= constants.MAX_PARTY_SIZE
	) {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(dragStartX, dragStartY));
		uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), "PARTY_FULL");
		return;
	}

	// Validate slot occupation (only if not an upgrade)
	if (!existingUnit || existingUnit.rank > 3) {
		const occupier = getUnitAt(getState().session.team.units)(targetTile);
		if (occupier) {
			charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(dragStartX, dragStartY));
			uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), "SLOT_OCCUPIED");
			return;
		}
	}

	// Use the GameController to handle the purchase
	const controller = getGameController();
	const success = await controller.purchaseUnit(shopUnitData.cardId);

	if (!success) {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(dragStartX, dragStartY));
		uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), "SERVER_REJECTED");
		return;
	}

	// Handle the visual updates after successful purchase
	if (existingUnit && existingUnit.rank <= 3) {
		upgradeUnit(existingUnit);
		charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));
		await ShopUI.slideOut();
		return;
	}

	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	getState().session.team.units.push(newUnit);

	const { runStats } = getState().session;
	if (runStats) {
		runStats.totalUnitsRecruited++;
		const unitName = getName(newUnit.cardId);
		runStats.unitUsage[unitName] = (runStats.unitUsage[unitName] || 0) + 1;
	}

	summon(newUnit, true);
	charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));
	await ShopUI.slideOut();
}
