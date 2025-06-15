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

export class Shop {

	private scene: BattlegroundScene;
	private flyout: Flyout;
	private shopUI: ShopUI;

	private currentShopCharas: Chara[] = [];
	private currentShopRelicCards: RelicCard[] = [];

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.flyout = new Flyout(this.scene);
		this.shopUI = new ShopUI(this.scene, this.flyout);
	}

	public open() {
		// Clear previous shop items
		this.currentShopCharas = [];
		this.currentShopRelicCards = [];

		// Prepare data for the shop UI
		const filteredCards = Card.getAllCards()
			.filter(card => !this.scene.state.gameData.player.units.map(u => u.cardId).includes(card.name));
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
