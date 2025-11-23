import * as Card from "@Models/Entities/Card";
import { pickRandom } from "../../../../utils";
import * as Chara from "@Systems/Chara/Chara";
import * as ShopPanel from "./ShopPanel";
import * as CharaShop from "./CharaShop";
import * as sc from "./constants";
import { tween } from "@Utils/animation";
import * as Board from "@Models/Board";
import { getCurrentScene, getState } from "@Models/State";

// TODO: is this necessary?
let currentShopCharas: Chara.Chara[] = [];

export async function openHeroShop(filter?: (u: Card.CardDefinition) => boolean): Promise<void> {
	return new Promise<void>(async (resolve) => {
		currentShopCharas = [];

		const tavernCardData = getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS, filter);

		const finishPhaseCallback = async () => {
			await close();
			resolve();
		};

		ShopPanel.create(finishPhaseCallback);

		// Render tavern charas
		const displayedCharas = CharaShop.renderTavernCharas(tavernCardData);
		currentShopCharas = displayedCharas;

		Board.setEnemyBoardVisible(false);

		await ShopPanel.slideIn();
		currentShopCharas.forEach((chara) => animateItemAppearance(chara));

	});
}

export async function openCoreShop() {
	currentShopCharas = [];

	const tavernCardData = pickRandom(
		Card.getAllCards().filter((card) => card.isCore),
		sc.NUM_TAVERN_SLOTS
	);

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
	return currentShopCharas.map((chara) => Chara.getUnit(chara).cardId).map(Card.getCardDefinition);
}

async function animateItemAppearance(chara: Chara.Chara) {
	const targetScaleX = chara.scaleX;
	const targetScaleY = chara.scaleY;

	chara.setScale(0);

	tween({
		targets: [chara],
		scaleX: targetScaleX,
		scaleY: targetScaleY,
		duration: sc.SHOP_ITEM_APPEAR_SCALE_DURATION,
	});

	getCurrentScene().tweens.chain({
		targets: chara,
		tweens: [
			{
				angle: -sc.SHOP_ITEM_APPEAR_WIGGLE_ANGLE,
				duration: sc.SHOP_ITEM_APPEAR_WIGGLE_DURATION_1,
				yoyo: true,
				ease: "Quad.easeInOut",
			},
			{
				angle: sc.SHOP_ITEM_APPEAR_WIGGLE_ANGLE,
				duration: sc.SHOP_ITEM_APPEAR_WIGGLE_DURATION_2,
				yoyo: true,
				ease: "Quad.easeInOut",
			},
			{ angle: 0, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_RETURN_DURATION, ease: "Quad.easeIn" },
		],
	});
}

function getAvailableCardsForTavern(count: number, filter?: (u: Card.CardDefinition) => boolean): Card.CardDefinition[] {
	const allCards = Card.getNonCores();
	const filteredCards = filter ?
		allCards.filter(filter) :
		allCards;
	const playerUnits = getState().gameData.player.units;
	const maxRankCardIds = new Set(
		playerUnits.filter((u) => u.rank >= 4).map((u) => u.cardId)
	);

	const availableCards = filteredCards.filter((card) => !maxRankCardIds.has(card.id));

	return pickRandom(availableCards, count);
}
