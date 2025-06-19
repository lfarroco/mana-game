import * as Card from "../../../../Models/Entities/Card";
import { Flyout } from "../../../../UI/Flyout";
import { pickRandom } from "../../../../utils";
import { RelicCard } from "../Relic";
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
import { State } from "../../../../Models/State";
import { tween } from "../../../../Utils/animation";

/**
 * @class Shop
 * @description Manages the in-game shop system, allowing players to purchase characters (Charas) and acquire relics.
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
	 * @type {RelicCard[]}
	 * @description Array of RelicCard instances currently available for acquisition in the shop. These are the interactive GameObjects.
	 */
	currentShopRelicCards: RelicCard[] = [];

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

	/**
	 * @method open
	 * @description Opens the shop interface. It clears previously displayed shop items,
	 * fetches new random characters and relics (ensuring characters offered are not already owned by the player),
	 * and then instructs {@link ShopUI} to render them. Finally, it slides the shop {@link Flyout} into view.
	 */
	async open() {
		// Clear previous shop items
		this.currentShopCharas = [];
		this.currentShopRelicCards = [];

		// Prepare data for the shop UI
		const ownedCardIds = new Set(this.scene.state.gameData.player.units.map(u => u.cardId));
		const filteredCards = Card.getAllCards()
			.filter(card =>
				!ownedCardIds.has(card.id)
			);
		const tavernCardData = pickRandom(filteredCards, 3);
		const relicData = pickRandom(Card.getAllRelicDefinitions(), 3);

		// Define callbacks for the UI
		const nextRoundCallback = () => {
			this.scene.events.emit(GameEvents.SHOP_PHASE_ENDED);
			this.flyout.slideOut();
		};

		const charaPurchaseFinalizedCallback = (purchasedChara: Chara) => {
			// Chara is already removed from flyout by its onPurchased handler (via ShopUI)
			// Chara instance will be destroyed by CharaManager.
			// Update our list of available shop charas.
			this.currentShopCharas = this.currentShopCharas.filter(c => c.id !== purchasedChara.id);
		};

		const relicAcquisitionFinalizedCallback = (acquiredRelic: RelicCard) => {
			// RelicCard is already removed from flyout by its onAcquire handler (via ShopUI)
			// Update our list of available shop relics.
			this.currentShopRelicCards = this.currentShopRelicCards.filter(rc => rc.id !== acquiredRelic.id);
		};

		const { charas, relicCards } = this.shopUI.displayShop(
			relicData, tavernCardData,
			nextRoundCallback,
			this.handleShopRerollTavern.bind(this),
			charaPurchaseFinalizedCallback,
			relicAcquisitionFinalizedCallback
		);

		this.currentShopCharas = charas;
		this.currentShopRelicCards = relicCards;

		charas.forEach(c => c.setScale(0))

		await this.flyout.slideIn();
		// Animate the appearance of newly added charas
		this.currentShopCharas.forEach(chara => this._animateCharaAppearance(chara));
		// Potentially animate relic cards too, if desired
	}

	// TODO: add tests
	// TODO: add animation for reroll

	getShopCharaBySlot(slotIndex: number): Chara | null {
		return this.currentShopCharas[slotIndex] || null;
	}

	getShopRelicCardBySlot(slotIndex: number): RelicCard | null {
		return this.currentShopRelicCards[slotIndex] || null;
	}

	getDisplayedHeroCardDefinitions(): Card.CardDefinition[] {
		return this.currentShopCharas.map(chara => chara.unit.cardId)
			.map(Card.getCardDefinition);
	}

	getDisplayedRelicDefinitions(): Card.RelicDefinition[] {
		return this.currentShopRelicCards.map(rc => rc.id)
			.map(Card.getRelicDefinition);
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
	 * Animates the appearance of a Chara card in the shop.
	 * The animation involves scaling up and a slight "wiggle".
	 * @param chara The Chara instance to animate.
	 */
	private async _animateCharaAppearance(chara: Chara): Promise<void> {
		chara.scale = 0;
		tween({
			targets: [chara],
			scale: 1,
			duration: 400
		});
		//shake card left and right
		await tween({
			targets: [chara],
			angle: -10,
			yoyo: true,
			repeat: 0,
			duration: 100
		});
		await tween({ targets: [chara], angle: 10, yoyo: true, repeat: 0, duration: 100 });
	}

	/**
	 * Rerolls the characters available in the tavern.
	 * This method clears the current tavern characters, fetches a new set,
	 * and updates the UI to display them. Relics and shop buttons remain unchanged.
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
		const ownedCardIds = new Set(this.scene.state.gameData.player.units.map(u => u.cardId));
		const filteredCards = Card.getAllCards().filter(card => !ownedCardIds.has(card.id));
		// TODO: Make the number of tavern slots a constant
		const newTavernCardData = pickRandom(filteredCards, 3);

		// 3. Define the charaPurchaseFinalizedCallback (same as in open())
		const charaPurchaseFinalizedCallback = (purchasedChara: Chara) => {
			this.currentShopCharas = this.currentShopCharas.filter(c => c.id !== purchasedChara.id);
		};

		// 4. Update the ShopUI with new characters
		const newShopCharas = this.shopUI.rerenderTavernCharas(newTavernCardData, charaPurchaseFinalizedCallback);
		this.currentShopCharas = newShopCharas;

		// Animate the appearance of newly rerolled charas
		newShopCharas.forEach(chara => this._animateCharaAppearance(chara));
	}
}
