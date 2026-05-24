import { Unit } from "@Models/Entities/Unit";
import * as GameController from "@Core/GameController";

export async function itemClickPurchaseRequested(
	shopUnitData: Unit,
	_shopCharaId: string,
	_dragStartX: number,
	_dragStartY: number
): Promise<void> {

	const serverSuccess = await GameController.purchaseUnit(
		shopUnitData.cardId,
	);

	if (!serverSuccess) {
		throw new Error("Purchase failed on server");
	}

}
