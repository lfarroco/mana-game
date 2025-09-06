import { scene } from "../../../BattlegroundScene";
import * as constants from "../../../../../constants/constants";
import { vec2 } from "@Models/Geometry";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getUnitAt } from "@Models/State";
import { getCharaById, summon } from "@Systems/Chara/Chara";
import * as uiEvents from "@UI/events";
import * as charaEvents from "@Systems/Chara/events";
import * as Systems from "../../index";
import * as Shop from "../Shop";

export function itemDragPurchaseRequested(
	shopUnitData: Unit,
	shopCharaId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) {

	if (scene.state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		charaEvents.onShopPurchaseFailed(getCharaById(shopCharaId), vec2(
			dragStartX, dragStartY
		));
		uiEvents.onPurchaseFailed(
			shopUnitData.name,
			"PARTY_FULL"
		);
		return;
	}

	const occupier = getUnitAt(scene.state.gameData.player.units)(targetTile);
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
	scene.state.gameData.player.units.push(newUnit);

	summon(newUnit, true);

	charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

	// Move to next phase after placing hero (same as next round button)
	Systems.ShopPhase.handleShopPhaseEnded();
	Shop.close();
}