import * as Card from "../../../../Models/Entities/Card";
import { Flyout } from "../../../../UI/Flyout";
import { pickRandom } from "../../../../utils";
import { Chara } from "../../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../../BattlegroundScene";
import { GameEvents } from "../../../../constants/events"; // Corrected import path if needed
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

/**
 * @class Shop
 * @description Manages the in-game shop system, allowing players to purchase characters (Charas).
 * It interfaces with {@link ShopUI} to display the shop, handles purchase logic via external handlers,
 * and manages the state of available items.
 */
export class Shop {

	scene: BattlegroundScene;
	state: State;
	flyout: Flyout;
	shopUI: ShopUI;

	/**
	 * @type {Chara[]}
	 * @description Array of Chara instances currently available for purchase in the shop. These are the interactive GameObjects.
	 */
	currentShopCharas: Chara[] = [];

	/**
	 * Creates an instance of the Shop.
	 * @param {BattlegroundScene} scene - The main battleground scene instance.
	 */
	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.state = scene.state;
		this.flyout = new Flyout(this.scene);
		this.shopUI = new ShopUI(this.scene, this.flyout);
	}

	_handleCharaPurchaseFinalized(purchasedChara: Chara): void {
		// Chara is already removed from flyout by its onPurchased handler (via ShopUI)
		// Chara instance will be destroyed by CharaManager.
		// Update our list of available shop charas.
		this.currentShopCharas = this.currentShopCharas.filter(c => c.id !== purchasedChara.id);
	}

	/**
	 * @method open
	 * @description Opens the shop interface. It clears previously displayed shop items,
	 * fetches new random characters (ensuring characters offered are not already owned by the player),
	 * and then instructs {@link ShopUI} to render them. Finally, it slides the shop {@link Flyout} into view.
	 */
	async open() {
		this.currentShopCharas = [];

		const tavernCardData = this._getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

		const orbs = ['red', 'green', 'yellow']

		// Define the nextRoundCallback, which was missing
		const nextRoundCallback = () => {
			this.scene.events.emit(GameEvents.SHOP_PHASE_ENDED);
			this.flyout.slideOut();
		};

		// Correctly call shopUI.displayShop and destructure its result
		const { charas } = this.shopUI.displayShop(
			tavernCardData, // cardsToDisplay
			orbs,
			nextRoundCallback, // nextRoundCallback
			this.handleShopRerollTavern.bind(this),
			this._handleCharaPurchaseFinalized.bind(this),
		);

		// Hide enemy board immediately after rendering board slots
		if (this.scene.playerBoard) {
			this.scene.playerBoard.setEnemyBoardVisible(false);
		}


		this.currentShopCharas = charas;

		await this.flyout.slideIn();
		this.currentShopCharas.forEach(chara => this._animateItemAppearance(chara));
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

	/**
	 * Animates the appearance of a shop item (Chara).
	 * The animation involves scaling up and a slight "wiggle".
	 * @param item The Phaser.GameObjects.GameObject (e.g., Chara (Container) to animate.
	 *             It must have scaleX, scaleY, angle properties and a setScale method.
	 */
	async _animateItemAppearance(
		item: Chara
	): Promise<void> {
		const targetScaleX = item.scaleX;
		const targetScaleY = item.scaleY;

		item.setScale(0); // Start animation from scale 0

		tween({
			targets: [item],
			scaleX: targetScaleX,
			scaleY: targetScaleY,
			duration: sc.SHOP_ITEM_APPEAR_SCALE_DURATION
		});

		//shake card left and right
		// Using a sequence for cleaner chained tweens
		this.scene.tweens.chain({
			targets: item,
			tweens: [
				{ angle: -sc.SHOP_ITEM_APPEAR_WIGGLE_ANGLE, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_DURATION_1, yoyo: true, ease: 'Quad.easeInOut' },
				{ angle: sc.SHOP_ITEM_APPEAR_WIGGLE_ANGLE, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_DURATION_2, yoyo: true, ease: 'Quad.easeInOut' },
				{ angle: 0, duration: sc.SHOP_ITEM_APPEAR_WIGGLE_RETURN_DURATION, ease: 'Quad.easeIn' } // Return to 0 angle smoothly
			]
		});
	}

	_getAvailableCardsForTavern(count: number): Card.CardDefinition[] {
		const ownedCardIds = new Set(this.state.gameData.player.units.map(u => u.cardId));
		const allCards = Card.getAllCards();
		// Filter out cards the player already owns (based on cardId, not unit instance id)
		// and also filter out cards that might be unique and already present on the board if that's a game rule.
		// For now, just filtering by owned cardId.
		const filteredCards = allCards.filter(card => !ownedCardIds.has(card.id));
		return pickRandom(filteredCards, count);
	}

	/**
	 * Rerolls the characters available in the tavern.
	 * This method clears the current tavern characters, fetches a new set,
	 * and updates the UI to display them.
	 * The gold deduction for this action is handled by `shopRerollTavernHandler`.
	 */
	rerollTavern(): void {
		// 1. Clear existing shop charas from UI and manager
		this.currentShopCharas.forEach(chara => {
			this.flyout.remove(chara, false); // Remove from flyout container, don't destroy Phaser GameObject yet
			CharaManager.destroyChara(chara.id); // This will call chara.destroy() and unregister from CharaManager
		});
		this.currentShopCharas = [];

		// 2. Prepare new card data for the tavern
		const newTavernCardData = this._getAvailableCardsForTavern(sc.NUM_TAVERN_SLOTS);

		// 4. Update the ShopUI with new characters
		const newShopCharas = this.shopUI.rerenderTavernCharas(
			newTavernCardData,
			this._handleCharaPurchaseFinalized.bind(this)
		);
		this.currentShopCharas = newShopCharas;

		// Animate the appearance of newly rerolled charas
		newShopCharas.forEach(chara => this._animateItemAppearance(chara));
	}
}
