import * as constants from "@Constants/constants";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import { getCharaById, summon, upgradeUnit } from "@Systems/Chara/Chara";
import * as charaEvents from "@Systems/Chara/events";
import * as uiEvents from "@UI/events";
import * as Geometry from "@Models/Geometry";
import * as Board from "@Models/Board";
import * as ShopUI from "../ShopPanel";
import { handlePhaseEnded } from "@Scenes/Battleground/PhaseManager";
import { getState } from "@Models/State";
import { getName } from "@i18n/i18n";
import { MultiplayerManager } from "../../../../../Multiplayer/MultiplayerManager";
import { getServerAdapter } from "@Core/ServerFactory";

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

	const existingUnit = getState().gameData.player.units.find(
		(u) => u.cardId === shopUnitData.cardId
	);

	if (MultiplayerManager.getInstance().isMultiplayer) {
		const targetTile = Board.getEmptySlot(
			getState().gameData.player.units,
			constants.FORCE_ID_PLAYER
		);

		// Check explicit party size limit (consistent with Single Player)
		if ((!existingUnit || existingUnit.rank > 3) && getState().gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
			handlePurchaseFailure("PARTY_FULL");
			return;
		}

		if (!targetTile && (!existingUnit || existingUnit.rank > 3)) {
			// If full and no upgrade possible
			handlePurchaseFailure("PARTY_FULL");
			return;
		}

		const success = await MultiplayerManager.getInstance().sendOptionSelection(shopUnitData.cardId);

		if (success) {
			if (existingUnit && existingUnit.rank <= 3) {
				await upgradeUnit(existingUnit);
			} else if (targetTile) {
				const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
				getState().gameData.player.units.push(newUnit);

				const { runStats } = getState().gameData;
				runStats.totalUnitsRecruited++;
				const unitName = getName(newUnit.cardId);
				runStats.unitUsage[unitName] = (runStats.unitUsage[unitName] || 0) + 1;

				summon(newUnit, true);
			}

			charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));
			await ShopUI.slideOut();
			handlePhaseEnded(getState());
		} else {
			handlePurchaseFailure("SERVER_REJECTED");
		}
		return;
	}

	// Single-player: use local server adapter
	const server = getServerAdapter();
	const playerId = getState().gameData.playerId || "sp_player";

	const targetTile = Board.getEmptySlot(
		getState().gameData.player.units,
		constants.FORCE_ID_PLAYER
	);

	// Check explicit party size limit
	if ((!existingUnit || existingUnit.rank > 3) && getState().gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		handlePurchaseFailure("PARTY_FULL");
		return;
	}

	if (!targetTile && (!existingUnit || existingUnit.rank > 3)) {
		handlePurchaseFailure("PARTY_FULL");
		return;
	}

	try {
		const success = await server.handleAction(playerId, shopUnitData.cardId);

		if (success) {
			if (existingUnit && existingUnit.rank <= 3) {
				await upgradeUnit(existingUnit);
			} else if (targetTile) {
				const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
				getState().gameData.player.units.push(newUnit);

				const { runStats } = getState().gameData;
				runStats.totalUnitsRecruited++;
				const unitName = getName(newUnit.cardId);
				runStats.unitUsage[unitName] = (runStats.unitUsage[unitName] || 0) + 1;

				summon(newUnit, true);
			}

			charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));
			await ShopUI.slideOut();
			handlePhaseEnded(getState());
		} else {
			handlePurchaseFailure("SERVER_REJECTED");
		}
		return;
	} catch (error) {
		console.error("Failed to purchase unit:", error);
		// Fallback to legacy logic for backward compatibility
	}

	// Legacy single-player logic (fallback)

	if (existingUnit && existingUnit.rank <= 3) {
		await upgradeUnit(existingUnit);

		charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

		await ShopUI.slideOut();
		handlePhaseEnded(getState());
		return;
	}

	if (getState().gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
		handlePurchaseFailure("PARTY_FULL");
		return;
	}

	// Use existing targetTile from above, or find one if not set
	if (!targetTile) {
		handlePurchaseFailure("NO_EMPTY_SLOT");
		return;
	}

	const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
	getState().gameData.player.units.push(newUnit);

	const { runStats } = getState().gameData;
	runStats.totalUnitsRecruited++;
	const unitName = getName(newUnit.cardId);
	runStats.unitUsage[unitName] = (runStats.unitUsage[unitName] || 0) + 1;

	summon(newUnit, true);

	charaEvents.onShopPurchaseSuccesful(getCharaById(shopCharaId));

	await ShopUI.slideOut();
	handlePhaseEnded(getState());
}
