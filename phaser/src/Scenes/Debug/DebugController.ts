import { BattlegroundScene } from "../Battleground/BattlegroundScene";
import { Unit } from "../../Models/Entities/Unit"; // Ensure Unit is exported from its module
import { vec2 } from "../../Models/Geometry";
import { CardDefinition } from "../../Models/Entities/Card";
import * as CharaManager from "../Battleground/Systems/CharaManager";
import * as constants from "../../constants/constants";
import { updatePlayerGoldIO } from "../../Models/Entities/Force";
import { shop } from "../Battleground/Systems/Shop/Shop";

export class DebugController {
	scene: BattlegroundScene;

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

		shop.handleShopItemClickPurchaseRequested({
			shopUnitData: unitToPurchase,
			shopCharaId: chara.id,
			dragStartX: chara.x,
			dragStartY: chara.y
		})

		return `Emitted SHOP_ITEM_CLICK_PURCHASE_REQUESTED for hero in shop slot ${slotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${chara.id}). Purchase processing is asynchronous.`;
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

		shop.handleShopItemDragPurchaseRequested({
			shopUnitData: unitToPurchase,
			shopCharaId: chara.id,
			targetTile: vec2(boardX, boardY),
			dragStartX: chara.x,
			dragStartY: chara.y
		})

		return `Emitted SHOP_ITEM_DRAG_PURCHASE_REQUESTED for hero in shop slot ${shopSlotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${chara.id}) to board (${boardX},${boardY}). Purchase and placement are asynchronous.`;
	}

	/**
	 * Simulates clicking the "Next Round" or "End Turn" button.
	 */
	clickNextRound(): string {
		this.scene.battleProgressionSystem.handleShopPhaseEnded();
		return "Emitted SHOP_PHASE_ENDED. Current shop phase should end, leading to combat or next round's shop.";
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

		// Delegate to the Chara's input handler which now owns the move logic
		const moveChara = CharaManager.getChara(unitId);
		moveChara.inputHandler.requestOwnedUnitMove(vec2(targetBoardX, targetBoardY), dragStartX, dragStartY);

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

		this.scene.handleOwnedUnitSold({ unitId: unitId, soldForGold: sellPrice });

		return `Sell request processed for unit ${unitId}. Sold for ${sellPrice} gold. State and visuals will update asynchronously.`;
	}

	// --- State Manipulation for Testing ---
	playerGoldDelta(delta: number): string {
		updatePlayerGoldIO(delta);
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

	// --- Utility / State Inspection ---
	getPlayerGold(): number {
		return this.scene.state.gameData.player.gold;
	}

	getShopHeroes(): CardDefinition[] {
		return this.scene.shop.getDisplayedHeroCardDefinitions ? this.scene.shop.getDisplayedHeroCardDefinitions() : []; // TODO: rename to getDisplayedShopHeroDefinitions
	}

	getPlayerBoardUnits(): Unit[] {
		return this.scene.state.gameData.player?.units || [];
	}

	logGameState(): void {
		console.log("Current Game State (DebugController):", {
			playerGold: this.getPlayerGold(),
			shopHeroes: this.getShopHeroes().map(c => c?.id),
			playerUnits: this.getPlayerBoardUnits().map(u => ({ id: u.id, cardId: u.cardId, x: u.position.x, y: u.position.y })),
			currentRound: this.scene.state.gameData?.round,
			// Add other relevant state parts
		});
	}
}
