import * as constants from "@Constants";
import * as Unit from "@Models/Entities/Unit";
import * as State from "@Models/State";
import * as Chara from "@Systems/Chara/Chara";
import * as uiEvents from "@Screens/Battleground/Components/UI/events";
import * as GameController from "@Core/GameController";
import * as i18n from "@i18n/i18n";
import * as shopCharaFeedback from "@Screens/Battleground/Components/Shop/events/shopCharaFeedback";

export async function itemDragPurchaseRequested(
	shopUnitData: Unit.Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {
	let shopChara: ReturnType<typeof Chara.mustGetCharaById> | null = null;
	try {
		shopChara = Chara.mustGetCharaById(shopCharaId);
	} catch {
		shopChara = null;
	}

	const { session } = state;

	const existingUnit = session.team.units.find((u) => u.cardId === shopUnitData.cardId);

	// Validate before purchase - party full check (only if not an upgrade)
	if (
		(!existingUnit || existingUnit.rank > 3) &&
		session.team.units.length >= constants.MAX_PARTY_SIZE
	) {
		io.screens.battleground.events.onShopUnitDragPurchaseFailed.emit({
			shopCharaId,
			dragStartVec: [dragStartX, dragStartY],
		});
		uiEvents.onPurchaseFailed(i18n.getName(shopUnitData.cardId), "PARTY_FULL");
		return;
	}

	// Validate slot occupation (only if not an upgrade)
	if (!existingUnit || existingUnit.rank > 3) {
		const occupier = State.getUnitAt(session.team.units)(targetTile);
		if (occupier) {
			io.screens.battleground.events.onShopUnitDragPurchaseFailed.emit({
				shopCharaId,
				dragStartVec: [dragStartX, dragStartY],
			});
			uiEvents.onPurchaseFailed(i18n.getName(shopUnitData.cardId), "SLOT_OCCUPIED");
			return;
		}
	}

	await GameController.purchaseUnit(shopUnitData.cardId, targetTile);

	// if (!success) {
	// 	if (shopChara) {
	// 		shopCharaFeedback.onShopPurchaseFailed(shopChara, [dragStartX, dragStartY]);
	// 	}
	// 	uiEvents.onPurchaseFailed(i18n.getName(shopUnitData.cardId), "SERVER_REJECTED");
	// 	return;
	// }

	// Keep server as source of truth for purchased/updated units.
	// The phase refresh triggered by GameController will sync team state and visuals.
	if (shopChara) {
		shopCharaFeedback.onShopPurchaseSuccesful(shopChara);
	}
}
