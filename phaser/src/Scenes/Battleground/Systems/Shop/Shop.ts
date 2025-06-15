import * as Card from "../../../../Models/Entities/Card";
import { Flyout } from "../../../../UI/Flyout";
import { pickRandom } from "../../../../utils";
import { RelicCard } from "../Relic";
import { Chara } from "../../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../../BattlegroundScene";
import { GameEvents } from "../../../../constants/events";
import { Vec2 } from "../../../../Models/Geometry";
import { Unit } from "../../../../Models/Entities/Unit";
import { ShopUI } from "./ShopUI";
import { shopOpenUITriggerHandler } from "./handlers/shopOpenUITriggerHandler";
import { shopItemClickPurchaseRequestedHandler } from "./handlers/shopItemClickPurchaseHandler";
import { shopItemDragPurchaseRequestedHandler } from "./handlers/shopItemDragPurchaseHandler";

/**
 * @class Shop
 * @description Manages the in-game shop system, allowing players to purchase characters (Charas) and acquire relics.
 * It interfaces with {@link ShopUI} to display the shop, handles purchase logic via external handlers,
 * and manages the state of available items.
 */
export class Shop {

	private scene: BattlegroundScene;
	private flyout: Flyout;
	private shopUI: ShopUI;

	/**
	 * @private
	 * @type {Chara[]}
	 * @description Array of Chara instances currently available for purchase in the shop. These are the interactive GameObjects.
	 */
	private currentShopCharas: Chara[] = [];
	/**
	 * @private
	 * @type {RelicCard[]}
	 * @description Array of RelicCard instances currently available for acquisition in the shop. These are the interactive GameObjects.
	 */
	private currentShopRelicCards: RelicCard[] = [];

	/**
	 * Creates an instance of the Shop.
	 * @param {BattlegroundScene} scene - The main battleground scene instance.
	 */
	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.flyout = new Flyout(this.scene);
		this.shopUI = new ShopUI(this.scene, this.flyout);
	}

	/**
	 * @public
	 * @method open
	 * @description Opens the shop interface. It clears previously displayed shop items,
	 * fetches new random characters and relics (ensuring characters offered are not already owned by the player),
	 * and then instructs {@link ShopUI} to render them. Finally, it slides the shop {@link Flyout} into view.
	 */
	public open() {
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
			nextRoundCallback, charaPurchaseFinalizedCallback, relicAcquisitionFinalizedCallback
		);

		this.currentShopCharas = charas;
		this.currentShopRelicCards = relicCards;

		this.flyout.slideIn();
	}

	public getShopCharaBySlot(slotIndex: number): Chara | null {
		return this.currentShopCharas[slotIndex] || null;
	}

	public getShopRelicCardBySlot(slotIndex: number): RelicCard | null {
		return this.currentShopRelicCards[slotIndex] || null;
	}

	public getDisplayedHeroCardDefinitions(): Card.CardDefinition[] {
		return this.currentShopCharas.map(chara => chara.unit.cardId)
			.map(Card.getCardDefinition);
	}

	public getDisplayedRelicDefinitions(): Card.RelicDefinition[] {
		return this.currentShopRelicCards.map(rc => rc.id)
			.map(Card.getRelicDefinition);
	}

	public async handleShopOpenUITrigger(): Promise<void> {
		await shopOpenUITriggerHandler(this);
	}

	public handleShopItemClickPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, dragStartX: number, dragStartY: number }): void {
		shopItemClickPurchaseRequestedHandler(this.scene, payload);
	}

	public handleShopItemDragPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }): void {
		shopItemDragPurchaseRequestedHandler(this.scene, payload);
	}
}
