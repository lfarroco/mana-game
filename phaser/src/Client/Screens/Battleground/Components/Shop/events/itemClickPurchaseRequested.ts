import * as Unit from "@Models/Entities/Unit";
import * as Chara from "@Systems/Chara/Chara";
import * as shopCharaFeedback from "@Screens/Battleground/Components/Shop/events/shopCharaFeedback";

export async function itemClickPurchaseRequested(
	shopUnitData: Unit.Unit,
	shopCharaId: string,
	_dragStartX: number,
	_dragStartY: number
): Promise<void> {

	const serverSuccess = await io.Controller.purchaseUnit(
		shopUnitData.cardId,
		null
	);

	if (!serverSuccess) {
		throw new Error("Purchase failed on server");
	}

	if (!Chara.hasCharaById(shopCharaId)) {
		return;
	}

	shopCharaFeedback.onShopPurchaseSuccesful(Chara.mustGetCharaById(shopCharaId));

}
