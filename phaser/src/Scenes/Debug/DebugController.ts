import { BattlegroundScene } from "../Battleground/BattlegroundScene";
import { GameEvents } from "../../constants/events";
import { Unit } from "../../Models/Entities/Unit"; // Ensure Unit is exported from its module
import { vec2 } from "../../Models/Geometry";
import { CardDefinition, RelicDefinition } from "../../Models/Entities/Card"; // For type safety

export class DebugController {
	private scene: BattlegroundScene;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		console.log("DebugController active. Access via `window.gameController`.");
	}

	/**
	 * Simulates clicking a hero card in the shop.
	 * Emits SHOP_ITEM_CLICK_PURCHASE_REQUESTED.
	 * @param slotIndex 0-based index of the hero slot in the shop.
	 */
	clickHeroInShop(slotIndex: number): string {
		const chara = this.scene.shop.getShopCharaBySlot(slotIndex);
		if (!chara) {
			return `Error: No hero Chara found in shop slot ${slotIndex}.`;
		}
		if (!chara.getIsShopItem()) {
			return `Error: Hero in slot ${slotIndex} (Chara ID: ${chara.id}) is not a shop item or already purchased.`;
		}
		const unitToPurchase = chara.unit;

		this.scene.events.emit(GameEvents.SHOP_ITEM_CLICK_PURCHASE_REQUESTED, {
			shopUnitData: unitToPurchase,
			shopCharaId: chara.id,
			dragStartX: chara.x, // Original position for potential revert on failure
			dragStartY: chara.y  // Original position for potential revert on failure
		});

		return `Emitted SHOP_ITEM_CLICK_PURCHASE_REQUESTED for hero in shop slot ${slotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${chara.id}). Purchase processing is asynchronous.`;
	}

	/**
	 * Simulates clicking a relic card in the shop.
	 * This should trigger the relic acquisition logic.
	 * @param slotIndex 0-based index of the relic slot in the shop.
	 */
	clickRelicInShop(slotIndex: number): string {
		const relicCard = this.scene.shop.getShopRelicCardBySlot(slotIndex);
		if (!relicCard) {
			return `Error: No RelicCard found in shop slot ${slotIndex}.`;
		}

		const relicDefinition = relicCard.relicData;
		const relicCardId = (relicCard as any).id || `slot_${slotIndex}`; // Fallback if RelicCard has no id

		this.scene.events.emit(GameEvents.SHOP_RELIC_CLICK_PURCHASE_REQUESTED, {
			relicDefinition: relicDefinition,
			shopRelicCardId: relicCardId
		});

		return `Emitted SHOP_RELIC_CLICK_PURCHASE_REQUESTED for relic in shop slot ${slotIndex} (Relic ID: ${relicDefinition.id}). Relic effect application is asynchronous.`;
	}

	/**
	 * Convenience function to buy a hero from the shop and immediately place it.
	 * Emits SHOP_ITEM_DRAG_PURCHASE_REQUESTED.
	 * @param shopSlotIndex 0-based index of the hero in the shop.
	 * @param boardX Target X coordinate on the board.
	 * @param boardY Target Y coordinate on the board.
	 */
	buyAndPlaceHero(shopSlotIndex: number, boardX: number, boardY: number): string {
		const chara = this.scene.shop.getShopCharaBySlot(shopSlotIndex);
		if (!chara) {
			return `Error: No hero Chara found in shop slot ${shopSlotIndex}.`;
		}
		if (!chara.getIsShopItem()) {
			return `Error: Hero in slot ${shopSlotIndex} (Chara ID: ${chara.id}) is not a shop item or already purchased.`;
		}
		const unitToPurchase = chara.unit;

		this.scene.events.emit(GameEvents.SHOP_ITEM_DRAG_PURCHASE_REQUESTED, {
			shopUnitData: unitToPurchase,
			shopCharaId: chara.id,
			targetTile: vec2(boardX, boardY),
			dragStartX: chara.x, // Original position for potential revert
			dragStartY: chara.y
		});

		return `Emitted SHOP_ITEM_DRAG_PURCHASE_REQUESTED for hero in shop slot ${shopSlotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${chara.id}) to board (${boardX},${boardY}). Purchase and placement are asynchronous.`;
	}

	/**
	 * Simulates clicking the "Next Round" or "End Turn" button.
	 */
	clickNextRound(): string {
		this.scene.events.emit(GameEvents.SHOP_PHASE_ENDED);
		return "Emitted SHOP_PHASE_ENDED. Current shop phase should end, leading to combat or next round's shop.";
	}

	// --- Utility / State Inspection ---
	getPlayerGold(): number {
		return this.scene.state.gameData.player?.gold ?? 0;
	}

	getShopHeroes(): CardDefinition[] {
		return this.scene.shop.getDisplayedHeroCardDefinitions ? this.scene.shop.getDisplayedHeroCardDefinitions() : [];
	}

	getShopRelics(): RelicDefinition[] { // Note: Returns RelicDefinition, not CardDefinition
		return this.scene.shop.getDisplayedRelicDefinitions ? this.scene.shop.getDisplayedRelicDefinitions() : [];
	}

	getPlayerBoardUnits(): Unit[] {
		return this.scene.state.gameData.player?.units || [];
	}

	logGameState(): void {
		console.log("Current Game State (DebugController):", {
			playerGold: this.getPlayerGold(),
			shopHeroes: this.getShopHeroes().map(c => c?.id),
			shopRelics: this.getShopRelics().map(c => c?.id),
			playerUnits: this.getPlayerBoardUnits().map(u => ({ id: u.id, cardId: u.cardId, x: u.position.x, y: u.position.y })),
			currentRound: this.scene.state.gameData?.round,
			// Add other relevant state parts
		});
	}
}
