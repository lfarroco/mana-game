import { Unit, makeUnit } from "@Models/Entities/Unit";
import { vec2 } from "@Models/Geometry";
import { CardDefinition, getCore } from "@Models/Entities/Card";
import { playerForce, cpuForce } from "@Models/Entities/Force";
import * as constants from "@Constants/constants";
import * as Chara from "@Systems/Chara/Chara";
import * as Systems from "../Battleground/Systems";
import { processOwnedUnitMoveRequest } from "@Systems/Chara/input";
import { startGame } from "../../Game/effects/startGame";
import { handlePhaseEnded } from "@Scenes/Battleground/PhaseManager";
import { getState } from "@Models/State";

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
	handlePhaseEnded();
	return "Emitted SHOP_PHASE_ENDED. Current shop phase should end, leading to combat or next round's shop.";
}

export function moveUnitOnBoard(
	unitId: string,
	targetBoardX: number,
	targetBoardY: number
): string {
	const unit = getState().gameData.player.units.find((u) => u.id === unitId);
	if (!unit) {
		return `Error: Unit with ID ${unitId} not found on player board`;
	}

	let dragStartX = 0;
	let dragStartY = 0;

	const chara = Chara.getCharaById(unitId);

	dragStartX = chara.x;
	dragStartY = chara.y;

	processOwnedUnitMoveRequest(unitId, vec2(targetBoardX, targetBoardY), dragStartX, dragStartY);

	return `Emitted OWNED_UNIT_MOVE_REQUESTED for unit ${unitId} to board (${targetBoardX},${targetBoardY}). Move/swap processing is asynchronous`;
}

export function discardUnitFromBoard(unitId: string): string {
	const unit = getState().gameData.player.units.find((u) => u.id === unitId);
	if (!unit) {
		return `Error: Unit with ID ${unitId} not found on player board. Cannot discard`;
	}

	Systems.Shop.events.ownedUnitSold(unitId);

	return `Discard request processed for unit ${unitId}. State and visuals will update asynchronously`;
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
	return getState().gameData.player?.units || [];
}

export function logGameState(): void {
	console.log("Current Game State (DebugController):", {
		shopHeroes: getShopHeroes().map((c) => c?.id),
		playerUnits: getPlayerBoardUnits().map((u) => ({
			id: u.id,
			cardId: u.cardId,
			x: u.position.x,
			y: u.position.y,
		})),
		currentRound: getState().gameData?.round,
	});
}

export function addUnitToPlayerBoard(cardId: string, boardX: number, boardY: number): string {
	const newUnit: Unit = {
		id: `test-unit-${Date.now()}-${Math.random()}`,
		cardId: cardId,
		name: `Test Unit ${cardId}`,
		pic: `${cardId}.png`,
		force: getState().gameData.player.id,
		position: vec2(boardX, boardY),
		power: 25,
		bonusPower: 0,
		life: 0,
		maxLife: 25,
		cooldown: 100,
		critical: 0,
		evade: 5,
		rank: 1,
		shield: 0,
		effects: [],
		reactions: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		isCore: false,
	};

	getState().gameData.player.units.push(newUnit);

	return `Added unit ${cardId} (ID: ${newUnit.id}) to board position (${boardX}, ${boardY})`;
}

export function clickGameStart() {
	startGame();
}

export async function summon(
	forceId: string,
	cardId: string,
	x: number = 0,
	y: number = 0
): Promise<string> {
	const state = getState();

	// Validate force ID
	if (forceId !== constants.FORCE_ID_PLAYER && forceId !== constants.FORCE_ID_CPU) {
		return `Error: Invalid force ID "${forceId}". Use "${constants.FORCE_ID_PLAYER}" or "${constants.FORCE_ID_CPU}"`;
	}

	// Create the unit
	const newUnit = makeUnit(forceId, cardId, vec2(x, y));

	// Add to the appropriate force's units
	if (forceId === constants.FORCE_ID_PLAYER) {
		state.gameData.player.units.push(newUnit);
	} else {
		// CPU units go into battleData.units during battles
		state.battleData.units.push(newUnit);
	}

	// Visually summon the character
	await Chara.summon(newUnit, true);

	return `Summoned ${cardId} (ID: ${newUnit.id}) to ${forceId} board at position (${x}, ${y})`;
}

export async function triggerGameComplete(wins: number = 0): Promise<void> {
	const { getCurrentScene } = await import("@Models/State");
	const { init } = await import("@Components/Tooltip");
	const { displayGameComplete } = await import("../Battleground/Results/GameCompleteUI");

	const gameState = getState();
	gameState.gameData.player.wins = wins;
	if (wins < 10) {
		gameState.gameData.player.lives = 0;
	} else {
		gameState.gameData.player.lives = 4;
	}

	if (gameState.gameData.player.units.length === 0) {
		gameState.gameData.player.units = [
			{
				id: "test-unit-1",
				cardId: "fortress",
				name: "Warrior",
				pic: "boss_city",
				force: "PLAYER",
				position: { x: 0, y: 0 },
				rank: 1,
				power: 10,
				bonusPower: 0,
				life: 100,
				maxLife: 100,
				shield: 0,
				cooldown: 100,
				evade: 0,
				effects: [],
				reactions: [],
				charge: 0,
				refresh: 0,
				hasted: 0,
				slowed: 0,
				isCore: false
			},
			{
				id: "test-unit-2",
				cardId: "parry_master",
				name: "Healer",
				pic: "neutral_swordofakrane",
				force: "PLAYER",
				position: { x: 1, y: 1 },
				rank: 1,
				power: 10,
				bonusPower: 0,
				life: 80,
				maxLife: 80,
				shield: 0,
				cooldown: 100,
				evade: 0,
				effects: [],
				reactions: [],
				charge: 0,
				refresh: 0,
				hasted: 0,
				slowed: 0,
				isCore: false
			},
			{
				id: "test-unit-3",
				cardId: "parry_master",
				name: "Healer",
				pic: "neutral_swordofakrane",
				force: "PLAYER",
				position: { x: 2, y: 2 },
				rank: 1,
				power: 10,
				life: 80,
				maxLife: 80,
				bonusPower: 0,
				shield: 0,
				cooldown: 100,
				evade: 0,
				effects: [],
				reactions: [],
				charge: 0,
				refresh: 0,
				hasted: 0,
				slowed: 0,
				isCore: false
			}
		];
	}

	const scene = getCurrentScene();
	const container = scene.add.container(0, 0);
	container.setDepth(2000);
	const state = {
		resultsContainer: container,
		backgroundOverlay: null,
		isOpen: true
	};

	init();

	displayGameComplete(state, wins, gameState.gameData.player.units);
}

export function defeatCpu(): string {
	const core = getCore(cpuForce.id);
	if (!core) return "Error: CPU core not found";
	core.life = 0;
	return "CPU core life set to 0. Victory imminent.";
}

export function defeatPlayer(): string {
	const core = getCore(playerForce.id);
	if (!core) return "Error: Player core not found";
	core.life = 0;
	return "Player core life set to 0. Defeat imminent.";
}

export async function setWins(wins: number): Promise<string> {
	const { updateWinsDisplay } = await import("../../UI/components/winsDisplay");
	getState().gameData.player.wins = wins;
	updateWinsDisplay(wins);
	return `Wins set to ${wins}`;
}
