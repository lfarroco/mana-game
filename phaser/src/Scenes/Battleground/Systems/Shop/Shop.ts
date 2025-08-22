import * as Card from "../../../../Models/Entities/Card";
import { Flyout } from "../../../../UI/Flyout";
import { pickRandom } from "../../../../utils";
import { Chara } from "../../../../Systems/Chara/Chara";
import { scene } from "../../BattlegroundScene";
import { Vec2 } from "../../../../Models/Geometry";
import { Unit } from "../../../../Models/Entities/Unit";
import { ShopUI } from "./ShopUI";
import { shopItemClickPurchaseRequestedHandler } from "./handlers/shopItemClickPurchaseHandler";
import { shopItemDragPurchaseRequestedHandler } from "./handlers/shopItemDragPurchaseHandler";
import { shopRerollTavernHandler } from "./handlers/shopRerollTavernHandler";
import * as CharaManager from "../CharaManager";
import * as sc from "./ShopConstants";
import { tween } from "../../../../Utils/animation";


export let flyout: Flyout;
export let shopUI: ShopUI;
let currentShopCharas: Chara[] = [];
let currentOrbs: string[] = [];

export function init() {
	flyout = new Flyout(scene);
	shopUI = new ShopUI(scene, flyout);
}

export function handleCharaPurchaseFinalized(purchasedChara: Chara): void {
	currentShopCharas = currentShopCharas.filter(c => c.id !== purchasedChara.id);
}

export async function open() {
	currentShopCharas = [];

	const tavernCardData = _getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

	const availableOrbs = [
		"crimson_orb",
		"emerald_orb",
		"azure_orb",
		"golden_orb",
		"violet_orb",
		"charge_orb",
	];
	currentOrbs = pickRandom(availableOrbs, 3);

	const nextRoundCallback = () => {
		scene.battleProgressionSystem.handleShopPhaseEnded();
		close();
	};

	const { charas } = shopUI.displayShop(
		tavernCardData,
		currentOrbs,
		nextRoundCallback,
		handleShopRerollTavern,
	);

	if (scene.playerBoard) {
		scene.playerBoard.setEnemyBoardVisible(false);
	}

	currentShopCharas = charas;

	await flyout.slideIn();
	currentShopCharas.forEach(chara => _animateItemAppearance(chara));
}

export async function close() {
	shopUI.destroyOrbs();
	currentOrbs = [];

	await flyout.slideOut();
}

// TODO: add tests
// TODO: add animation for reroll

export function getShopCharaBySlot(slotIndex: number): Chara | null {
	return currentShopCharas[slotIndex] || null;
}

export function getDisplayedHeroCardDefinitions(): Card.CardDefinition[] {
	return currentShopCharas.map(chara => chara.unit.cardId)
		.map(Card.getCardDefinition);
}

export async function handleShopOpenUITrigger(): Promise<void> {
	await open();
}

export function handleShopItemClickPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, dragStartX: number, dragStartY: number }): void {
	shopItemClickPurchaseRequestedHandler(payload);
}

export function handleShopItemDragPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }): void {
	shopItemDragPurchaseRequestedHandler(payload);
}
export function handleShopRerollTavern() {
	shopRerollTavernHandler();
}

async function _animateItemAppearance(
	chara: Chara
): Promise<void> {
	const targetScaleX = chara.container.scaleX;
	const targetScaleY = chara.container.scaleY;

	chara.container.setScale(0);

	tween({
		targets: [chara.container],
		scaleX: targetScaleX,
		scaleY: targetScaleY,
		duration: sc.SHOP_ITEM_APPEAR_SCALE_DURATION
	});

	scene.tweens.chain({
		targets: chara,
		tweens: [
			{ angle: -sc.SHOP_ITEM_APPEAR_WIGGLE_ANGLE, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_DURATION_1, yoyo: true, ease: 'Quad.easeInOut' },
			{ angle: sc.SHOP_ITEM_APPEAR_WIGGLE_ANGLE, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_DURATION_2, yoyo: true, ease: 'Quad.easeInOut' },
			{ angle: 0, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_RETURN_DURATION, ease: 'Quad.easeIn' }
		]
	});
}

function _getAvailableCardsForTavern(count: number): Card.CardDefinition[] {
	const ownedCardIds = new Set(scene.state.gameData.player.units.map(u => u.cardId));
	const allCards = Card.getAllCards();
	const filteredCards = allCards.filter(card => !ownedCardIds.has(card.id));
	return pickRandom(filteredCards, count);
}

export function rerollTavern(): void {
	currentShopCharas.forEach(chara => {
		flyout.remove(chara.container, false);
		CharaManager.destroyChara(chara.id);
	});
	currentShopCharas = [];

	const newTavernCardData = _getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

	const newShopCharas = shopUI.rerenderTavernCharas(
		newTavernCardData
	);
	currentShopCharas = newShopCharas;

	newShopCharas.forEach(chara => _animateItemAppearance(chara));
}
