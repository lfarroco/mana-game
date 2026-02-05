import * as constants from "@Constants/constants";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getCharaById, summon, upgradeUnit } from "@Systems/Chara/Chara";
import * as charaEvents from "@Systems/Chara/events";
import * as uiEvents from "@UI/events";
import * as Geometry from "@Models/Geometry";
import * as Board from "@Models/Board";
import * as ShopUI from "../ShopPanel";
import { getState } from "@Models/State";
import { getName } from "@i18n/i18n";
import { getGameController } from "@Core/GameControllerFactory";

export async function itemClickPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	dragStartX: number,
	dragStartY: number
): Promise<void> {
	const handlePurchaseFailure = (reason: string, cost?: number) => {
		charaEvents.onShopPurchaseFailed(
			getCharaById(shopCharaId),
			Geometry.vec2(dragStartX, dragStartY)
		);

		uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), reason, cost);
	};

	const existingUnit = getState().session.team.units.find(
		(u) => u.cardId === shopUnitData.cardId
	);

	const targetTile = Board.getEmptySlot(
		getState().session.team.units,
		constants.FORCE_ID_PLAYER
	);

	// Check explicit party size limit
	if ((!existingUnit || existingUnit.rank > 3) && getState().session.team.units.length >= constants.MAX_PARTY_SIZE) {
		handlePurchaseFailure("PARTY_FULL");
		return;
	}

	if (!targetTile && (!existingUnit || existingUnit.rank > 3)) {
		handlePurchaseFailure("PARTY_FULL");
		return;
	}

	// Use the GameController to handle the purchase
	const controller = getGameController();
	const success = await controller.purchaseUnit(shopUnitData.cardId);

	if (success) {
		// Handle the visual updates after successful purchase
		if (existingUnit && existingUnit.rank <= 3) {
			await upgradeUnit(existingUnit);
		} else if (targetTile) {
			const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
			getState().session.team.units.push(newUnit);

			const { runStats } = getState().session;
			if (runStats) {
				runStats.totalUnitsRecruited++;
				const unitName = getName(newUnit.cardId);
				runStats.unitUsage[unitName] = (runStats.unitUsage[unitName] || 0) + 1;
			}

			summon(newUnit, true);
		}

		charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));
		await ShopUI.slideOut();
	} else {
		handlePurchaseFailure("SERVER_REJECTED");
	}
}
