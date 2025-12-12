import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getState, getUnitAt } from "@Models/State";
import { getCharaById, summon, upgradeUnit } from "@Systems/Chara/Chara";
import * as uiEvents from "@UI/events";
import * as charaEvents from "@Systems/Chara/events";
import * as ShopUI from "../ShopPanel";
import * as PhaseManager from "@Scenes/Battleground/PhaseManager";
import { getName } from "@i18n/i18n";

export async function itemDragPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {
	const existingUnit = getState().gameData.player.units.find(
		(u) => u.cardId === shopUnitData.cardId
	);

	if (existingUnit && existingUnit.rank <= 3) {
		upgradeUnit(existingUnit);

		charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

		await ShopUI.slideOut();

		PhaseManager.handlePhaseEnded();
		return;
	}

	if (getState().gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(dragStartX, dragStartY));
		uiEvents.onPurchaseFailed(getName(shopUnitData), "PARTY_FULL");
		return;
	}

	const occupier = getUnitAt(getState().gameData.player.units)(targetTile);
	if (occupier) {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(dragStartX, dragStartY));
		uiEvents.onPurchaseFailed(getName(shopUnitData), "SLOT_OCCUPIED");
		return;
	}

	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	getState().gameData.player.units.push(newUnit);

	const { runStats } = getState().gameData;
	runStats.totalUnitsRecruited++;
	const unitName = getName(newUnit);
	runStats.unitUsage[unitName] = (runStats.unitUsage[unitName] || 0) + 1;

	summon(newUnit, true);

	charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

	await ShopUI.slideOut();
	PhaseManager.handlePhaseEnded();
}
