import { BattlegroundScene } from "../Battleground/BattlegroundScene";
import { GameEvents } from "../../constants/events";
import { Unit } from "../../Models/Entities/Unit"; // Ensure Unit is exported from its module
import { vec2 } from "../../Models/Geometry";
import { CardDefinition, RelicDefinition } from "../../Models/Entities/Card";
import * as CharaManager from "../Battleground/Systems/CharaManager";
import { makeUnit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { Relic, RelicCard } from "../Battleground/Systems/Relic"; // Added Relic and RelicCard

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

		if (relicCard.owned) {
			return `Error: Relic in slot ${slotIndex} (ID: ${relicCard.id}) is already owned. Cannot click to buy.`;
		}

		// Directly call the method that handles click purchase logic on the RelicCard instance
		// This will internally handle purchase checks, gold deduction, adding to player state,
		// and calling its onAcquire callback (which updates shop UI and Shop's internal list).
		relicCard.handlePointerUp();

		return `Called handlePointerUp() for relic in shop slot ${slotIndex} (ID: ${relicCard.id}). Purchase processing initiated.`;
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

	/**
	 * Directly adds a unit to the player's board state at a specific tile position.
	 * Note: This only updates the state data and does NOT create a Chara GameObject
	 * or emit the necessary events for visual representation. Use with caution,
	 * primarily for state-based test setups like filling the party.
	 * @param cardId The ID of the card definition for the unit.
	 * @param boardX The X coordinate on the board grid.
	 * @param boardY The Y coordinate on the board grid.
	 * @param summonCharaVisual If true, also emits an event to create the visual Chara. Defaults to false.
	 */
	addUnitToPlayerBoard(cardId: string, boardX: number, boardY: number, summonCharaVisual: boolean = false): string {
		const newUnit = makeUnit(constants.FORCE_ID_PLAYER, cardId, vec2(boardX, boardY));
		this.scene.state.gameData.player.units.push(newUnit);

		let message = `Added unit ${newUnit.id} (Card ID: ${cardId}) to player board state at (${boardX}, ${boardY}).`;

		if (summonCharaVisual) {
			// This event is handled by BattlegroundEventSystem, which calls CharaManager.summonChara
			this.scene.events.emit(GameEvents.BOARD_CHARA_CREATE_REQUESTED, { unit: newUnit });
			message += ` Event ${GameEvents.BOARD_CHARA_CREATE_REQUESTED} emitted for visual summoning.`;
		}
		return message;
	}

	/**
	 * Simulates dragging an owned unit on the player's board to a new tile.
	 * Emits OWNED_UNIT_MOVE_REQUESTED.
	 * @param unitId The ID of the unit to move.
	 * @param targetBoardX The target X coordinate on the board grid.
	 * @param targetBoardY The target Y coordinate on the board grid.
	 */
	moveUnitOnBoard(unitId: string, targetBoardX: number, targetBoardY: number): string {
		const unit = this.scene.state.gameData.player.units.find(u => u.id === unitId);
		if (!unit) {
			return `Error: Unit with ID ${unitId} not found on player board.`;
		}

		// Get the Chara instance to find its current visual position for dragStartX/Y
		// This is important for the Chara's revertDragOrFailedPurchase method if the move is rejected.
		// If the Chara doesn't exist (e.g. unit added directly to state), fallback to logical position.
		let dragStartX = 0;
		let dragStartY = 0;
		try {
			const chara = CharaManager.getChara(unitId);
			if (!chara) {
				throw new Error(`Chara for unit ${unitId} not found.`);
			}
			dragStartX = chara.x;
			dragStartY = chara.y;
		} catch (e) {
			const visualPos = CharaManager.getCharaPosition(unit); // Calculates visual center from logical
			dragStartX = visualPos.x;
			dragStartY = visualPos.y;
			console.warn(`DebugController.moveUnitOnBoard: Chara for unit ${unitId} not found. Using logical position for dragStart. Error: ${e}`);
		}

		this.scene.events.emit(GameEvents.OWNED_UNIT_MOVE_REQUESTED, {
			unitId: unitId,
			targetTile: vec2(targetBoardX, targetBoardY),
			dragStartX: dragStartX, // Current visual X of the chara
			dragStartY: dragStartY  // Current visual Y of the chara
		});

		return `Emitted OWNED_UNIT_MOVE_REQUESTED for unit ${unitId} to board (${targetBoardX},${targetBoardY}). Move/swap processing is asynchronous.`;
	}

	/**
	 * Simulates selling an owned unit from the player's board.
	 * @param unitId The ID of the unit to sell.
	 */
	sellUnitFromBoard(unitId: string): string {
		const unit = this.scene.state.gameData.player.units.find(u => u.id === unitId);
		if (!unit) {
			return `Error: Unit with ID ${unitId} not found on player board. Cannot sell.`;
		}

		const sellPrice = Math.floor(constants.SHOP_ITEM_PURCHASE_COST / 2);

		// Emit events similar to Chara.ts _handleSellUnit
		this.scene.events.emit(GameEvents.PLAYER_GOLD_DELTA_REQUEST, sellPrice);
		// BattlegroundScene listens to OWNED_UNIT_SOLD to remove unit from state and destroy Chara visual
		this.scene.events.emit(GameEvents.OWNED_UNIT_SOLD, { unitId: unitId, soldForGold: sellPrice });

		return `Sell request processed for unit ${unitId}. Sold for ${sellPrice} gold. State and visuals will update asynchronously.`;
	}

	/**
	 * Simulates selling an owned relic from the player's possession.
	 * @param relicId The ID of the relic to sell.
	 */
	sellPlayerRelic(relicId: string): string {
		const playerRelics = this.scene.state.gameData.player.relics;
        // Check if the relic exists in the player's inventory (optional, for more robust error handling)
        const relicExists = playerRelics.some(r => r.id === relicId);
        if (!relicExists) {
            return `Error: Relic with ID ${relicId} not found in player's possession. Cannot sell.`;
        }

		const sellPrice = Math.floor(RelicCard.RELIC_COST / 2);

		// Emit the OWNED_RELIC_SOLD event. The BattlegroundScene handler will
		// manage gold update, state removal, and visual cleanup if the RelicCard didn't self-destruct.
		this.scene.events.emit(GameEvents.OWNED_RELIC_SOLD, { relicId: relicId, soldForGold: sellPrice });

		return `Sell request processed for relic ${relicId} for ${sellPrice} gold. Emitted ${GameEvents.OWNED_RELIC_SOLD}. State and visuals will update asynchronously.`;
	}

	// --- State Manipulation for Testing ---
	playerGoldDelta(delta: number): string {
		this.scene.events.emit(GameEvents.PLAYER_GOLD_DELTA_REQUEST, delta);
		return `Player gold update requested to ${delta}. (Delta: ${delta}).`;
	}

	isShopVisible() {
		return this.scene.shop.flyout.isOpen;
	}

	// --- Game Constants Accessors ---
	getShopItemCost(): number {
		return constants.SHOP_ITEM_PURCHASE_COST;
	}

	getMaxPartySize(): number {
		return constants.MAX_PARTY_SIZE;
	}

	getRelicCost(): number {
		return RelicCard.RELIC_COST;
	}

	// --- Utility / State Inspection ---
	getPlayerGold(): number {
		return this.scene.state.gameData.player.gold;
	}

	getShopHeroes(): CardDefinition[] {
		return this.scene.shop.getDisplayedHeroCardDefinitions ? this.scene.shop.getDisplayedHeroCardDefinitions() : []; // TODO: rename to getDisplayedShopHeroDefinitions
	}

	getShopRelicDefinitions(): RelicDefinition[] {
		return this.scene.shop.getDisplayedRelicDefinitions ? this.scene.shop.getDisplayedRelicDefinitions() : [];
	}

	getPlayerBoardUnits(): Unit[] {
		return this.scene.state.gameData.player?.units || [];
	}

	getPlayerRelics(): Relic[] {
		return this.scene.state.gameData.player?.relics || [];
	}

	logGameState(): void {
		console.log("Current Game State (DebugController):", {
			playerGold: this.getPlayerGold(),
			shopHeroes: this.getShopHeroes().map(c => c?.id),
			shopRelics: this.getShopRelicDefinitions().map(r => r?.id),
			playerUnits: this.getPlayerBoardUnits().map(u => ({ id: u.id, cardId: u.cardId, x: u.position.x, y: u.position.y })),
			playerRelics: this.getPlayerRelics().map(r => ({ id: r.id, position: r.position })),
			currentRound: this.scene.state.gameData?.round,
			// Add other relevant state parts
		});
	}
}
