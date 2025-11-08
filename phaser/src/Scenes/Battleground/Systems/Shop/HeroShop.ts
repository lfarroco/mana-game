import * as Card from "@Models/Entities/Card";
import { pickRandom } from "../../../../utils";
import * as Chara from "@Systems/Chara/Chara";
import { scene } from "../../BattlegroundScene";
import * as ShopPanel from "./ShopPanel";
import * as CharaShop from "./CharaShop";
import * as sc from "./constants";
import { tween } from "@Utils/animation";
import * as Board from "@Models/Board";
import * as PhaseManager from "@Scenes/Battleground/PhaseManager";

// TODO: is this necessary?
let currentShopCharas: Chara.Chara[] = [];

export async function open() {
	currentShopCharas = [];

	const tavernCardData = getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

	const nextRoundCallback = async () => {

		await close();
		PhaseManager.handlePhaseEnded();
	};

	ShopPanel.create(nextRoundCallback);

	// Render tavern charas
	const displayedCharas = CharaShop.renderTavernCharas(tavernCardData);
	currentShopCharas = displayedCharas;

	Board.setEnemyBoardVisible(false);

	await ShopPanel.slideIn();
	currentShopCharas.forEach(chara => animateItemAppearance(chara));
}

export async function openCoreShop() {
	currentShopCharas = [];

	const tavernCardData = pickRandom(
		Card.getAllCards().filter(card => card.isCore),
		sc.NUM_TAVERN_SLOTS)

	ShopPanel.create(null);

	// Render tavern charas
	const displayedCharas = CharaShop.renderTavernCharas(tavernCardData);
	currentShopCharas = displayedCharas;

	Board.setEnemyBoardVisible(false);

	await ShopPanel.slideIn();

	currentShopCharas.forEach(animateItemAppearance);
}

export async function close() {
	currentShopCharas = [];

	await ShopPanel.slideOut();
}

export function getShopCharaBySlot(slotIndex: number): Chara.Chara | null {
	return currentShopCharas[slotIndex] || null;
}

export function getDisplayedHeroCardDefinitions(): Card.CardDefinition[] {
	return currentShopCharas.map(chara => Chara.getUnit(chara).cardId)
		.map(Card.getCardDefinition);
}

async function animateItemAppearance(
	chara: Chara.Chara
) {
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
	const allCards = Card.getNonCores()
	return pickRandom(allCards, count);
}

export function rerollTavern(): void {
	currentShopCharas.forEach(chara => {
		ShopPanel.removeChild(chara, false);
		Chara.destroy(chara);
	});
	currentShopCharas = [];

	const newTavernCardData = getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

	const newShopCharas = CharaShop.renderTavernCharas(
		newTavernCardData
	);
	currentShopCharas = newShopCharas;

	newShopCharas.forEach(chara => animateItemAppearance(chara));
}
