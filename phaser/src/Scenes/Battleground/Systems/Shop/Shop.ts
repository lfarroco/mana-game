import * as Card from "@Models/Entities/Card";
import { pickRandom } from "../../../../utils";
import * as Chara from "@Systems/Chara/Chara";
import { scene } from "../../BattlegroundScene";
import * as ShopUI from "./ShopUI";
import * as sc from "./constants";
import * as events from "./events";
import { tween } from "../../../../Utils/animation";
import * as MoraleDisplay from "../../MoraleDisplay";
import * as Systems from "../index"
import * as Board from "@Models/Board";
import { playerForce } from "@Models/Entities/Force";

let currentShopCharas: Chara.Chara[] = [];
let currentOrbs: string[] = [];

export function init() {
	ShopUI.create();
	MoraleDisplay.init();
}

export function handleCharaPurchaseFinalized(purchasedChara: Chara.Chara): void {
	currentShopCharas = currentShopCharas.filter(c => Chara.getId(c) !== Chara.getId(purchasedChara));
}

export async function open(buttonText: string = "Next Round", mode: 'hero' | 'orb' = 'hero') {
	currentShopCharas = [];

	let tavernCardData: Card.CardDefinition[] = [];
	let availableOrbs: string[] = [];

	if (mode === 'hero') {
		tavernCardData = _getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);
	} else {
		availableOrbs = [
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
	}

	const nextRoundCallback = () => {
		Systems.ShopPhase.handleShopPhaseEnded();
		close();
	};

	ShopUI.displayCommonShop(nextRoundCallback, buttonText, mode);

	if (mode === 'hero') {
		// Add reroll button for hero mode
		const rerollButtonX = ShopUI.getPanelX() + 470;
		const rerollButtonY = sc.PANEL_Y + sc.TAVERN_BG_HEIGHT - 20;
		const rerollBtn = ShopUI.createUIButton(scene, `Reroll`, rerollButtonX, rerollButtonY, events.rerollTavern);
		ShopUI.addToShopContainer(rerollBtn);

		// Render tavern charas
		currentShopCharas = ShopUI.renderTavernCharas(tavernCardData);
	} else {
		// Render orbs for orb mode
		const shopState = ShopUI.getState();
		if (shopState) {
			const { renderOrbs } = require('./Orbs');
			renderOrbs(shopState, currentOrbs);
		}
	}

	Board.setEnemyBoardVisible(false);

	await ShopUI.slideIn();
	if (mode === 'hero') {
		currentShopCharas.forEach(chara => _animateItemAppearance(chara));
	}
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

export async function handleShopOpenUITrigger(buttonText: string = "Next Round", mode: 'hero' | 'orb' = 'hero'): Promise<void> {
	await open(buttonText, mode);
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
	const playerFilters = playerForce.skills.flatMap(skill => skill.cardFilters);
	const filteredCards = allCards
		.filter(card => !ownedCardIds.has(card.id))
		.filter(card => playerFilters.every(filter => filter(card.effects)));
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
