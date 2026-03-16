import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { Unit } from "@Models/Entities/Unit";
import { getState, getUnitAt } from "@Models/State";
import { getCharaById } from "@Systems/Chara/Chara";
import * as uiEvents from "@UI/events";
import * as charaEvents from "@Systems/Chara/events";
import { getGameController } from "@Core/GameControllerFactory";
import { getName } from "@i18n/i18n";

export async function itemDragPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {
	const shopChara = (() => {
		try {
			return getCharaById(shopCharaId);
		} catch {
			return undefined;
		}
	})();

	const existingUnit = getState().session.team.units.find((u) => u.cardId === shopUnitData.cardId);

	// Validate before purchase - party full check (only if not an upgrade)
	if (
		(!existingUnit || existingUnit.rank > 3) &&
		getState().session.team.units.length >= constants.MAX_PARTY_SIZE
	) {
		if (shopChara) {
			charaEvents.onShopPurchaseFailed(shopChara, vec2(dragStartX, dragStartY));
		}
		uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), "PARTY_FULL");
		return;
	}

	// Validate slot occupation (only if not an upgrade)
	if (!existingUnit || existingUnit.rank > 3) {
		const occupier = getUnitAt(getState().session.team.units)(targetTile);
		if (occupier) {
			if (shopChara) {
				charaEvents.onShopPurchaseFailed(shopChara, vec2(dragStartX, dragStartY));
			}
			uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), "SLOT_OCCUPIED");
			return;
		}
	}

	// Use the GameController to handle the purchase
	const controller = getGameController();
	const success = await controller.purchaseUnit(shopUnitData.cardId);

	if (!success) {
		if (shopChara) {
			charaEvents.onShopPurchaseFailed(shopChara, vec2(dragStartX, dragStartY));
		}
		uiEvents.onPurchaseFailed(getName(shopUnitData.cardId), "SERVER_REJECTED");
		return;
	}

	// Keep server as source of truth for purchased/updated units.
	// The phase refresh triggered by GameController will sync team state and visuals.
	if (shopChara) {
		charaEvents.onShopPurchaseSuccesful(shopChara);
	}
}
