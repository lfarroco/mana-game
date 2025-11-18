import * as constants from "@Constants/constants";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getCharaById, summon, upgrade } from "@Systems/Chara/Chara";
import * as charaEvents from "@Systems/Chara/events";
import * as uiEvents from "@UI/events";
import * as Geometry from "@Models/Geometry";
import * as Board from "@Models/Board";
import * as ShopUI from "../ShopPanel";
import { handlePhaseEnded } from "@Scenes/Battleground/PhaseManager";
import { getState } from "@Models/State";

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

		uiEvents.onPurchaseFailed(shopUnitData.name, reason, cost);
	};

	const existingUnit = getState().gameData.player.units.find(
		(u) => u.cardId === shopUnitData.cardId
	);

	if (existingUnit && existingUnit.rank <= 3) {
		await upgrade(existingUnit);

		charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

		await ShopUI.slideOut();
		handlePhaseEnded();
		return;
	}

	if (getState().gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		handlePurchaseFailure("PARTY_FULL");
		return;
	}

	const targetTile = Board.getEmptySlot(
		getState().gameData.player.units,
		constants.FORCE_ID_PLAYER
	);
	if (!targetTile) {
		handlePurchaseFailure("NO_EMPTY_SLOT");
		return;
	}

	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	getState().gameData.player.units.push(newUnit);

	summon(newUnit, true);

	charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

	await ShopUI.slideOut();
	handlePhaseEnded();
}
