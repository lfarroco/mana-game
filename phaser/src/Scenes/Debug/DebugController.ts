import { scene } from "../Battleground/BattlegroundScene";
import { Unit } from "../../Models/Entities/Unit"; // Ensure Unit is exported from its module
import { vec2 } from "../../Models/Geometry";
import { CardDefinition } from "../../Models/Entities/Card";
import * as CharaManager from "../Battleground/Systems/CharaManager";
import * as constants from "../../constants/constants";
import { updatePlayerGoldIO } from "../../Models/Entities/Force";
import * as Shop from "../Battleground/Systems/Shop/Shop";
import * as ShopUI from "../Battleground/Systems/Shop/ShopUI";
import { titleScene } from "../Title/TitleScene";
import * as CharaInputHandler from "../../Systems/Chara/CharaInputHandler";
import * as Chara from "../../Systems/Chara/Chara";

export function clickHeroInShop(slotIndex: number): string {
	const chara = Shop.getShopCharaBySlot(slotIndex);
	if (!chara) {
		return `Error: No hero Chara found in shop slot ${slotIndex}.`;
	}
	if (!Chara.getIsShopItem(chara)) {
		return `Error: Hero in slot ${slotIndex} (Chara ID: ${Chara.getId(chara)}) is not a shop item or already purchased.`;
	}
	const unitToPurchase = Chara.getUnit(chara);

	Shop.handleShopItemClickPurchaseRequested({
		shopUnitData: unitToPurchase,
		shopCharaId: Chara.getId(chara),
		dragStartX: chara.x,
		dragStartY: chara.y
	})

	return `Emitted SHOP_ITEM_CLICK_PURCHASE_REQUESTED for hero in shop slot ${slotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${Chara.getId(chara)}). Purchase processing is asynchronous.`;
}

export function buyAndPlaceHero(shopSlotIndex: number, boardX: number, boardY: number): string {
	const chara = Shop.getShopCharaBySlot(shopSlotIndex);
	if (!chara) {
		return `Error: No hero Chara found in shop slot ${shopSlotIndex}.`;
	}
	if (!Chara.getIsShopItem(chara)) {
		return `Error: Hero in slot ${shopSlotIndex} (Chara ID: ${Chara.getId(chara)}) is not a shop item or already purchased.`;
	}
	const unitToPurchase = Chara.getUnit(chara);

	Shop.handleShopItemDragPurchaseRequested({
		shopUnitData: unitToPurchase,
		shopCharaId: Chara.getId(chara),
		targetTile: vec2(boardX, boardY),
		dragStartX: chara.x,
		dragStartY: chara.y
	})

	return `Emitted SHOP_ITEM_DRAG_PURCHASE_REQUESTED for hero in shop slot ${shopSlotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${Chara.getId(chara)}) to board (${boardX},${boardY}). Purchase and placement are asynchronous.`;
}

export function clickNextRound(): string {
	scene.battleProgressionSystem.handleShopPhaseEnded();
	return "Emitted SHOP_PHASE_ENDED. Current shop phase should end, leading to combat or next round's shop.";
}

export function moveUnitOnBoard(unitId: string, targetBoardX: number, targetBoardY: number): string {
	const unit = scene.state.gameData.player.units.find(u => u.id === unitId);
	if (!unit) {
		return `Error: Unit with ID ${unitId} not found on player board.`;
	}

	let dragStartX = 0;
	let dragStartY = 0;

	const chara = CharaManager.getChara(unitId);

	dragStartX = chara.x;
	dragStartY = chara.y;

	const moveChara = CharaManager.getChara(unitId);
	CharaInputHandler.requestOwnedUnitMove(Chara.getInputHandler(moveChara))(vec2(targetBoardX, targetBoardY), dragStartX, dragStartY);

	return `Emitted OWNED_UNIT_MOVE_REQUESTED for unit ${unitId} to board (${targetBoardX},${targetBoardY}). Move/swap processing is asynchronous.`;
}

export function sellUnitFromBoard(unitId: string): string {
	const unit = scene.state.gameData.player.units.find(u => u.id === unitId);
	if (!unit) {
		return `Error: Unit with ID ${unitId} not found on player board. Cannot sell.`;
	}

	const sellPrice = Math.floor(constants.SHOP_ITEM_PURCHASE_COST / 2);

	scene.handleOwnedUnitSold({ unitId: unitId, soldForGold: sellPrice });

	return `Sell request processed for unit ${unitId}. Sold for ${sellPrice} gold. State and visuals will update asynchronously.`;
}

export function playerGoldDelta(delta: number): string {
	updatePlayerGoldIO(delta);
	return `Player gold update requested to ${delta}. (Delta: ${delta}).`;
}

export function isShopVisible(): boolean {
	return ShopUI.getIsShopOpen();
}

export function getShopItemCost(): number {
	return constants.SHOP_ITEM_PURCHASE_COST;
}

export function getMaxPartySize(): number {
	return constants.MAX_PARTY_SIZE;
}

export function getPlayerGold(): number {
	return scene.state.gameData.player.gold;
}

export function getShopHeroes(): CardDefinition[] {
	return Shop.getDisplayedHeroCardDefinitions();
}

export function getPlayerBoardUnits(): Unit[] {
	return scene.state.gameData.player?.units || [];
}

export function logGameState(): void {
	console.log("Current Game State (DebugController):", {
		playerGold: getPlayerGold(),
		shopHeroes: getShopHeroes().map(c => c?.id),
		playerUnits: getPlayerBoardUnits().map(u => ({ id: u.id, cardId: u.cardId, x: u.position.x, y: u.position.y })),
		currentRound: scene.state.gameData?.round,
		// Add other relevant state parts
	});
}

export function addUnitToPlayerBoard(cardId: string, boardX: number, boardY: number): string {
	// Create a unit using the existing unit creation utilities
	const newUnit: Unit = {
		id: `test-unit-${Date.now()}-${Math.random()}`,
		cardId: cardId,
		name: `Test Unit ${cardId}`,
		pic: `${cardId}.png`,
		force: scene.state.gameData.player.id,
		position: vec2(boardX, boardY),
		power: 25,
		cooldown: 100,
		crit: 10,
		evade: 5,
		effects: [],
		reactions: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0
	};

	// Add the unit to the player's units array
	scene.state.gameData.player.units.push(newUnit);

	// You might need to trigger visual updates here as well
	// This depends on how your game's state management works

	return `Added unit ${cardId} (ID: ${newUnit.id}) to board position (${boardX}, ${boardY})`;
}

export function clickGameStart() {
	titleScene.startGame();
}