import * as Card from "../../../../Models/Entities/Card";
import { pickRandom } from "../../../../utils";
import * as Chara from "../../../../Systems/Chara/Chara";
import { scene } from "../../BattlegroundScene";
import * as ShopUI from "./ShopUI";
import * as sc from "./constants";
import * as events from "./events";
import { tween } from "../../../../Utils/animation";


let currentShopCharas: Chara.Chara[] = [];
let currentOrbs: string[] = [];

export function init() {
	ShopUI.create();
}

export function handleCharaPurchaseFinalized(purchasedChara: Chara.Chara): void {
	currentShopCharas = currentShopCharas.filter(c => Chara.getId(c) !== Chara.getId(purchasedChara));
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
		"positional_power_orb",
		"positional_typed_power_orb"
	];
	currentOrbs = pickRandom(availableOrbs, 3);

	const nextRoundCallback = () => {
		scene.battleProgressionSystem.handleShopPhaseEnded();
		close();
	};

	const { charas } = ShopUI.displayShop(
		tavernCardData,
		currentOrbs,
		nextRoundCallback,
		events.rerollTavern,
	);

	if (scene.playerBoard) {
		scene.playerBoard.setEnemyBoardVisible(false);
	}

	currentShopCharas = charas;

	await ShopUI.slideIn();
	currentShopCharas.forEach(chara => _animateItemAppearance(chara));
}

export async function close() {
	ShopUI.destroyOrbs();
	currentOrbs = [];

	await ShopUI.slideOut();
}


export function getShopCharaBySlot(slotIndex: number): Chara.Chara | null {
	return currentShopCharas[slotIndex] || null;
}

export function getDisplayedHeroCardDefinitions(): Card.CardDefinition[] {
	return currentShopCharas.map(chara => Chara.getUnit(chara).cardId)
		.map(Card.getCardDefinition);
}

export async function handleShopOpenUITrigger(): Promise<void> {
	await open();
}

async function _animateItemAppearance(
	chara: Chara.Chara
): Promise<void> {
	const targetScaleX = chara.scaleX;
	const targetScaleY = chara.scaleY;

	chara.setScale(0);

	tween({
		targets: [chara],
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
		ShopUI.removeShopChild(chara, false);
		Chara.destroy(chara);
	});
	currentShopCharas = [];

	const newTavernCardData = _getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

	const newShopCharas = ShopUI.renderTavernCharas(
		newTavernCardData
	);
	currentShopCharas = newShopCharas;

	newShopCharas.forEach(chara => _animateItemAppearance(chara));
}
