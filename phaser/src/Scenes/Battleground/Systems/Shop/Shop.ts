import * as Card from "../../../../Models/Entities/Card";
import { Flyout } from "../../../../UI/Flyout";
import { pickRandom } from "../../../../utils";
import { RelicCard } from "../Relic";
import { Chara } from "../../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../../BattlegroundScene";
import { GameEvents } from "../../../../constants/events";
import * as constants from "../../../../constants/constants";
import { Vec2 } from "../../../../Models/Geometry";
import { makeUnit, Unit } from "../../../../Models/Entities/Unit";
import { getUnitAt } from "../../../../Models/State";
import { ShopUI } from "./ShopUI";

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
		this.open();
	}

	public handleShopItemClickPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, dragStartX: number, dragStartY: number }): void {
		const { shopUnitData, shopCharaId, dragStartX, dragStartY } = payload;

		if (this.scene.state.gameData.player.gold < constants.SHOP_ITEM_PURCHASE_COST) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "INSUFFICIENT_GOLD", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "INSUFFICIENT_GOLD", cost: constants.SHOP_ITEM_PURCHASE_COST });
			return;
		}
		if (this.scene.state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "PARTY_FULL", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "PARTY_FULL" });
			return;
		}

		const targetTile = this.scene.playerBoard.getEmptySlot(this.scene.state.gameData.player.units, constants.FORCE_ID_PLAYER);
		if (!targetTile) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "NO_EMPTY_SLOT", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "NO_EMPTY_SLOT" });
			return;
		}

		this.scene.events.emit(GameEvents.PLAYER_GOLD_UPDATE_REQUEST, -constants.SHOP_ITEM_PURCHASE_COST);
		const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
		this.scene.state.gameData.player.units.push(newUnit);

		this.scene.events.emit(GameEvents.BOARD_CHARA_CREATE_REQUESTED, { unit: newUnit });
		this.scene.events.emit(GameEvents.SHOP_PURCHASE_SUCCESSFUL, { purchasedUnit: newUnit, originalShopCharaId: shopCharaId });
	}

	public handleShopItemDragPurchaseRequested(payload: { shopUnitData: Unit, shopCharaId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }): void {
		const { shopUnitData, shopCharaId, targetTile, dragStartX, dragStartY } = payload;

		if (this.scene.state.gameData.player.gold < constants.SHOP_ITEM_PURCHASE_COST) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "INSUFFICIENT_GOLD", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "INSUFFICIENT_GOLD", cost: constants.SHOP_ITEM_PURCHASE_COST });
			return;
		}
		if (this.scene.state.gameData.player.units.length >= constants.MAX_PARTY_SIZE) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "PARTY_FULL", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "PARTY_FULL" });
			return;
		}

		const occupier = getUnitAt(this.scene.state.gameData.player.units)(targetTile);
		if (occupier) {
			this.scene.events.emit(GameEvents.SHOP_PURCHASE_FAILED, { originalShopCharaId: shopCharaId, reason: "SLOT_OCCUPIED", dragStartX, dragStartY });
			this.scene.events.emit(GameEvents.PURCHASE_FAILED, { unitName: shopUnitData.name, reason: "SLOT_OCCUPIED" });
			return;
		}

		this.scene.events.emit(GameEvents.PLAYER_GOLD_UPDATE_REQUEST, -constants.SHOP_ITEM_PURCHASE_COST);
		const newUnit = makeUnit(constants.FORCE_ID_PLAYER, shopUnitData.cardId, targetTile);
		this.scene.state.gameData.player.units.push(newUnit);
		this.scene.events.emit(GameEvents.BOARD_CHARA_CREATE_REQUESTED, { unit: newUnit });
		this.scene.events.emit(GameEvents.SHOP_PURCHASE_SUCCESSFUL, { purchasedUnit: newUnit, originalShopCharaId: shopCharaId });
	}
}
