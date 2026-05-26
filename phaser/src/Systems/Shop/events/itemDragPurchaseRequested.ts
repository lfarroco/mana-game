import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { Unit } from "@Models/Entities/Unit";
import { getUnitAt } from "@Models/State";
import { mustGetCharaById } from "@Systems/Chara/Chara";
import * as uiEvents from "@UI/events";
import * as GameController from "@Core/GameController";
import { getName } from "@i18n/i18n";
import * as shopCharaFeedback from "@Systems/Shop/events/shopCharaFeedback";

export async function itemDragPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {
	let shopChara: ReturnType<typeof mustGetCharaById> | null = null;
	try {
		shopChara = mustGetCharaById(shopCharaId);
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
		if (shopChara) {
			shopCharaFeedback.onShopPurchaseFailed(shopChara, vec2(dragStartX, dragStartY));
		}
		uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), "PARTY_FULL");
		return;
	}

	// Validate slot occupation (only if not an upgrade)
	if (!existingUnit || existingUnit.rank > 3) {
		const occupier = getUnitAt(session.team.units)(targetTile);
		if (occupier) {
			if (shopChara) {
				shopCharaFeedback.onShopPurchaseFailed(shopChara, vec2(dragStartX, dragStartY));
			}
			uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), "SLOT_OCCUPIED");
			return;
		}
	}

	// Use the GameController to handle the purchase
	const targetSlot = targetTile.y * 3 + targetTile.x;
	const success = await GameController.purchaseUnit(shopUnitData.cardId, targetSlot);

	if (!success) {
		if (shopChara) {
			shopCharaFeedback.onShopPurchaseFailed(shopChara, vec2(dragStartX, dragStartY));
		}
		uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), "SERVER_REJECTED");
		return;
	}

	// Keep server as source of truth for purchased/updated units.
	// The phase refresh triggered by GameController will sync team state and visuals.
	if (shopChara) {
		shopCharaFeedback.onShopPurchaseSuccesful(shopChara);
	}
}
