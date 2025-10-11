import * as Card from "@Models/Entities/Card";
import { pickRandom } from "../../../../utils";
import * as Chara from "@Systems/Chara/Chara";
import { scene } from "../../BattlegroundScene";
import * as ShopUI from "./ShopUI";
import * as CharaShop from "./CharaShop";
import * as sc from "./constants";
import { tween } from "../../../../Utils/animation";
import * as MoraleDisplay from "../../MoraleDisplay";
import * as Systems from "../index"
import * as Board from "@Models/Board";

let currentShopCharas: Chara.Chara[] = [];

export function init() {
	ShopUI.create();
	MoraleDisplay.init();
}

export function handleCharaPurchaseFinalized(purchasedChara: Chara.Chara): void {
	currentShopCharas = currentShopCharas.filter(c => Chara.getId(c) !== Chara.getId(purchasedChara));

	// For hero shops 1 and 2, add a new hero to replace the purchased one
	if (currentShopCharas.length < sc.NUM_TAVERN_SLOTS) {
		const newCardData = getAvailableCardsForTavern(1);
		if (newCardData.length > 0) {
			const newCharas = CharaShop.renderTavernCharas(newCardData);
			currentShopCharas.push(...newCharas);
			newCharas.forEach(chara => _animateItemAppearance(chara));
		}
	}
}

export async function open(buttonText: string = "Next Shop") {
	currentShopCharas = [];

	const tavernCardData = getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

	const nextRoundCallback = () => {
		Systems.ShopPhase.handleShopPhaseEnded();
		close();
	};

	ShopUI.displayCommonShop(nextRoundCallback, buttonText);

	// Render tavern charas
	const displayedCharas = CharaShop.renderTavernCharas(tavernCardData);
	currentShopCharas = displayedCharas;

	Board.setEnemyBoardVisible(false);

	await ShopUI.slideIn();
	currentShopCharas.forEach(chara => _animateItemAppearance(chara));
}

export async function close() {
	currentShopCharas = [];

	await ShopUI.slideOut();
}

export function getShopCharaBySlot(slotIndex: number): Chara.Chara | null {
	return currentShopCharas[slotIndex] || null;
}

export function getDisplayedHeroCardDefinitions(): Card.CardDefinition[] {
	return currentShopCharas.map(chara => Chara.getUnit(chara).cardId)
		.map(Card.getCardDefinition);
}

export async function handleShopOpenUITrigger(buttonText: string = "Next Shop"): Promise<void> {
	await open(buttonText);
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

function getAvailableCardsForTavern(count: number): Card.CardDefinition[] {
	const allCards = Card.getAllCards();
	return pickRandom(allCards, count);
}

export function rerollTavern(): void {
	currentShopCharas.forEach(chara => {
		ShopUI.removeShopChild(chara, false);
		Chara.destroy(chara);
	});
	currentShopCharas = [];

	const newTavernCardData = getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

	const newShopCharas = CharaShop.renderTavernCharas(
		newTavernCardData
	);
	currentShopCharas = newShopCharas;

	newShopCharas.forEach(chara => _animateItemAppearance(chara));
}
