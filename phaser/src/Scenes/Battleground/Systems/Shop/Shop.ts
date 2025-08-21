import * as Card from "../../../../Models/Entities/Card";
import { Flyout } from "../../../../UI/Flyout";
import { pickRandom } from "../../../../utils";
import { Chara } from "../../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../../BattlegroundScene";
import { Vec2 } from "../../../../Models/Geometry";
import { Unit } from "../../../../Models/Entities/Unit";
import { ShopUI } from "./ShopUI";
import { shopOpenUITriggerHandler } from "./handlers/shopOpenUITriggerHandler";
import { shopItemClickPurchaseRequestedHandler } from "./handlers/shopItemClickPurchaseHandler";
import { shopItemDragPurchaseRequestedHandler } from "./handlers/shopItemDragPurchaseHandler";
import { shopRerollTavernHandler } from "./handlers/shopRerollTavernHandler";
import * as CharaManager from "../CharaManager";
import * as sc from "./ShopConstants";
import { State } from "../../../../Models/State";
import { tween } from "../../../../Utils/animation";

export let shop: Shop

export class Shop {

	scene: BattlegroundScene;
	state: State;
	flyout: Flyout;
	shopUI: ShopUI;

	currentShopCharas: Chara[] = [];

	currentOrbs: string[] = [];

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.state = scene.state;
		this.flyout = new Flyout(this.scene);
		this.shopUI = new ShopUI(this.scene, this.flyout);
		shop = this;
	}

	_handleCharaPurchaseFinalized(purchasedChara: Chara): void {
		this.currentShopCharas = this.currentShopCharas.filter(c => c.id !== purchasedChara.id);
	}

	async open() {
		this.currentShopCharas = [];

		const tavernCardData = this._getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

		const availableOrbs = [
			"crimson_orb",
			"emerald_orb",
			"azure_orb",
			"golden_orb",
			"violet_orb",
			"charge_orb",
		];
		this.currentOrbs = pickRandom(availableOrbs, 3);

		const nextRoundCallback = () => {
			this.scene.battleProgressionSystem.handleShopPhaseEnded();
			this.close();
		};

		const { charas } = this.shopUI.displayShop(
			tavernCardData,
			this.currentOrbs,
			nextRoundCallback,
			this.handleShopRerollTavern.bind(this),
		);

		if (this.scene.playerBoard) {
			this.scene.playerBoard.setEnemyBoardVisible(false);
		}

		this.currentShopCharas = charas;

		await this.flyout.slideIn();
		this.currentShopCharas.forEach(chara => this._animateItemAppearance(chara));
	}

	async close() {
		this.shopUI.destroyOrbs();
		this.currentOrbs = [];

		await this.flyout.slideOut();
	}

	// TODO: add tests
	// TODO: add animation for reroll

	getShopCharaBySlot(slotIndex: number): Chara | null {
		return this.currentShopCharas[slotIndex] || null;
	}

	getDisplayedHeroCardDefinitions(): Card.CardDefinition[] {
		return this.currentShopCharas.map(chara => chara.unit.cardId)
			.map(Card.getCardDefinition);
	}

	async handleShopOpenUITrigger(): Promise<void> {
		await shopOpenUITriggerHandler(this);
	}

	handleShopItemClickPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, dragStartX: number, dragStartY: number }): void {
		shopItemClickPurchaseRequestedHandler(this.scene, payload);
	}

	handleShopItemDragPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }): void {
		shopItemDragPurchaseRequestedHandler(this.scene, payload);
	}
	handleShopRerollTavern(): void {
		shopRerollTavernHandler(this);
	}

	async _animateItemAppearance(
		item: Chara
	): Promise<void> {
		const targetScaleX = item.scaleX;
		const targetScaleY = item.scaleY;

		item.setScale(0);

		tween({
			targets: [item],
			scaleX: targetScaleX,
			scaleY: targetScaleY,
			duration: sc.SHOP_ITEM_APPEAR_SCALE_DURATION
		});

		//shake card left and right
		this.scene.tweens.chain({
			targets: item,
			tweens: [
				{ angle: -sc.SHOP_ITEM_APPEAR_WIGGLE_ANGLE, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_DURATION_1, yoyo: true, ease: 'Quad.easeInOut' },
				{ angle: sc.SHOP_ITEM_APPEAR_WIGGLE_ANGLE, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_DURATION_2, yoyo: true, ease: 'Quad.easeInOut' },
				{ angle: 0, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_RETURN_DURATION, ease: 'Quad.easeIn' }
			]
		});
	}

	_getAvailableCardsForTavern(count: number): Card.CardDefinition[] {
		const ownedCardIds = new Set(this.state.gameData.player.units.map(u => u.cardId));
		const allCards = Card.getAllCards();
		const filteredCards = allCards.filter(card => !ownedCardIds.has(card.id));
		return pickRandom(filteredCards, count);
	}

	rerollTavern(): void {
		this.currentShopCharas.forEach(chara => {
			this.flyout.remove(chara, false);
			CharaManager.destroyChara(chara.id);
		});
		this.currentShopCharas = [];

		const newTavernCardData = this._getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

		const newShopCharas = this.shopUI.rerenderTavernCharas(
			newTavernCardData
		);
		this.currentShopCharas = newShopCharas;

		newShopCharas.forEach(chara => this._animateItemAppearance(chara));
	}
}
