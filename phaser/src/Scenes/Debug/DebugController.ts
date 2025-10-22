import { scene } from "../Battleground/BattlegroundScene";
import { Unit } from "@Models/Entities/Unit";
import { vec2 } from "@Models/Geometry";
import { CardDefinition } from "@Models/Entities/Card";
import * as constants from "@Constants/constants";
import * as  Chara from "@Systems/Chara/Chara";
import * as Systems from "../Battleground/Systems";
import { processOwnedUnitMoveRequest } from "@Systems/Chara/input";
import { startGame } from "@Scenes/Title/effects/startGame";

export function clickHeroInShop(slotIndex: number): string {
	const chara = Systems.Shop.HeroShop.getShopCharaBySlot(slotIndex);
	if (!chara) {
		return `Error: No hero Chara found in shop slot ${slotIndex}`;
	}
	const unitToPurchase = Chara.getUnit(chara);

	if (!Chara.isShopItem(unitToPurchase.id)) {
		return `Error: Hero in slot ${slotIndex} (Chara ID: ${Chara.getId(chara)}) is not a shop item or already purchased`;
	}

	Systems.Shop.events.itemClickPurchaseRequested(
		{ ...unitToPurchase },
		Chara.getId(chara),
		chara.x,
		chara.y
	);

	return `Emitted SHOP_ITEM_CLICK_PURCHASE_REQUESTED for hero in shop slot ${slotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${Chara.getId(chara)}). Purchase processing is asynchronous`;
}

export function buyAndPlaceHero(shopSlotIndex: number, boardX: number, boardY: number): string {
	const chara = Systems.Shop.HeroShop.getShopCharaBySlot(shopSlotIndex);
	if (!chara) {
		return `Error: No hero Chara found in shop slot ${shopSlotIndex}`;
	}
	const unitToPurchase = Chara.getUnit(chara);

	if (!Chara.isShopItem(unitToPurchase.id)) {
		return `Error: Hero in slot ${shopSlotIndex} (Chara ID: ${Chara.getId(chara)}) is not a shop item or already purchased`;
	}

	Systems.Shop.events.itemDragPurchaseRequested(
		unitToPurchase,
		Chara.getId(chara),
		vec2(boardX, boardY),
		chara.x,
		chara.y
	);

	return `Emitted SHOP_ITEM_DRAG_PURCHASE_REQUESTED for hero in shop slot ${shopSlotIndex} (Card ID: ${unitToPurchase.cardId}, Chara ID: ${Chara.getId(chara)}) to board (${boardX},${boardY}). Purchase and placement are asynchronous`;
}

export function clickNextRound(): string {
	Systems.ShopPhase.handleShopPhaseEnded();
	return "Emitted SHOP_PHASE_ENDED. Current shop phase should end, leading to combat or next round's shop.";
}

export function moveUnitOnBoard(unitId: string, targetBoardX: number, targetBoardY: number): string {
	const unit = scene.state.gameData.player.units.find(u => u.id === unitId);
	if (!unit) {
		return `Error: Unit with ID ${unitId} not found on player board`;
	}

	let dragStartX = 0;
	let dragStartY = 0;

	const chara = Chara.getCharaById(unitId);

	dragStartX = chara.x;
	dragStartY = chara.y;

	processOwnedUnitMoveRequest(
		unitId,
		vec2(targetBoardX, targetBoardY),
		dragStartX, dragStartY,
	);

	return `Emitted OWNED_UNIT_MOVE_REQUESTED for unit ${unitId} to board (${targetBoardX},${targetBoardY}). Move/swap processing is asynchronous`;
}

export function sellUnitFromBoard(unitId: string): string {
	const unit = scene.state.gameData.player.units.find(u => u.id === unitId);
	if (!unit) {
		return `Error: Unit with ID ${unitId} not found on player board. Cannot sell`;
	}

	const sellPrice = Math.floor(constants.SHOP_ITEM_PURCHASE_COST / 2);

	Systems.Shop.events.ownedUnitSold(unitId, sellPrice);

	return `Sell request processed for unit ${unitId}. Sold for ${sellPrice} gold. State and visuals will update asynchronously`;
}

export function isShopVisible(): boolean {
	return true; // TODO: implement me
}

export function getShopItemCost(): number {
	return constants.SHOP_ITEM_PURCHASE_COST;
}

export function getMaxPartySize(): number {
	return constants.MAX_PARTY_SIZE;
}

export function getShopHeroes(): CardDefinition[] {
	return Systems.Shop.HeroShop.getDisplayedHeroCardDefinitions();
}

export function getPlayerBoardUnits(): Unit[] {
	return scene.state.gameData.player?.units || [];
}

export function logGameState(): void {
	console.log("Current Game State (DebugController):", {
		shopHeroes: getShopHeroes().map(c => c?.id),
		playerUnits: getPlayerBoardUnits().map(u => ({ id: u.id, cardId: u.cardId, x: u.position.x, y: u.position.y })),
		currentRound: scene.state.gameData?.round,
	});
}

export function addUnitToPlayerBoard(cardId: string, boardX: number, boardY: number): string {
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

	scene.state.gameData.player.units.push(newUnit);

	return `Added unit ${cardId} (ID: ${newUnit.id}) to board position (${boardX}, ${boardY})`;
}

export function clickGameStart() {
	startGame();
}