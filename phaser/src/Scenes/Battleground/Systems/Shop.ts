import { images } from "../../../assets";
import * as Card from "../../../Models/Entities/Card";
import { vec2 } from "../../../Models/Geometry";
import { Flyout } from "../../../UI/Flyout";
import { pickRandom } from "../../../utils";
import { registerChara } from "./CharaManager";
import { RelicCard } from "./Relic";
import { Chara, CharaOptions } from "../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../BattlegroundScene";
import { playerForce } from "../../../Models/Entities/Force";
import { GameEvents } from "../../../constants/events";
import * as constants from "../../../constants/constants";
import { Vec2 } from "../../../Models/Geometry";
import { UIButton } from "../../../UI/UIButton";
import { makeUnit, Unit } from "../../../Models/Entities/Unit";
import { getUnitAt } from "../../../Models/State";
import * as sc from "./ShopConstants";

export class Shop {

	private scene: BattlegroundScene;
	private flyout: Flyout;

	private currentShopCharas: Chara[] = [];
	private currentShopRelicCards: RelicCard[] = [];

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.flyout = new Flyout(this.scene)
	}

	public open() {

		this.flyout.removeAll(true); // Clear any previous content from the flyout

		// Define the shop panel's dimensions based on its content.
		// These dimensions are relative to the flyout's origin.
		const panelPadding = 25; // Padding around the main content areas
		const shopPanelWidth = sc.RELIC_SECTION_X + sc.TAVERN_BG_OFFSET_X + sc.TAVERN_BG_WIDTH + panelPadding;
		// Height needs to accommodate relic/tavern sections and the button below them.
		const contentHeight = sc.RELIC_SECTION_Y + sc.RELIC_BG_HEIGHT;
		const buttonAreaHeight = 100; // Space for the button and some padding
		const shopPanelHeight = contentHeight + buttonAreaHeight + panelPadding;

		// Clear previous shop items
		this.currentShopCharas = [];
		this.currentShopRelicCards = [];

		// Add a background panel for the entire shop UI within the flyout
		const shopBackground = this.scene.add.graphics()
			.fillStyle(sc.PANEL_BG_COLOR, sc.PANEL_BG_OPACITY)
			.fillRoundedRect(sc.PANEL_X, sc.PANEL_Y, shopPanelWidth, shopPanelHeight, 20); // Rounded rectangle
		this.flyout.add(shopBackground);

		this.renderRelics();
		this.renderTavern();

		const nextRoundBtn = new UIButton(
			this.scene,
			"Next Round",
			sc.PANEL_X + shopPanelWidth - 100,
			sc.PANEL_Y + shopPanelHeight - 40,
			async () => {
				this.scene.events.emit(GameEvents.SHOP_PHASE_ENDED);
				this.flyout.slideOut();
			}
		);
		this.flyout.add(nextRoundBtn);

		this.flyout.slideIn();
	}

	private renderRelics(): void {

		const relicData = pickRandom(Card.getAllRelicDefinitions(), 3);

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRect(0, 0, sc.RELIC_BG_WIDTH, sc.RELIC_BG_HEIGHT)
			.setPosition(sc.RELIC_SECTION_X, sc.RELIC_SECTION_Y);

		const title = this.scene.add.text(sc.RELIC_TITLE_X, sc.RELIC_TITLE_Y, "Relics", constants.titleTextConfig);
		this.flyout.add([bg, title]);

		relicData.forEach((relic, index) => {
			const x = sc.RELIC_FIRST_ICON_X + (index * sc.RELIC_ICON_SPACING);
			const y = sc.RELIC_ICON_BASE_Y;

			const slot = this.scene.add
				.image(x, y, images.slot.key)
				.setDisplaySize(sc.RELIC_ICON_SIZE, sc.RELIC_ICON_SIZE);
			const icon = new RelicCard(
				this.scene,
				x, y,
				playerForce.id,
				relic,
				sc.RELIC_ICON_SIZE - 40, () => {
					if (this.flyout) this.flyout.remove(icon);
				});

			this.flyout.add([slot, icon]);
			this.currentShopRelicCards.push(icon);
		});

	}

	private renderTavern(): void {
		const { state } = this.scene; // Access state via scene

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRect(sc.TAVERN_BG_OFFSET_X, 0, sc.TAVERN_BG_WIDTH, sc.TAVERN_BG_HEIGHT)
			.setPosition(sc.RELIC_SECTION_X, sc.RELIC_SECTION_Y);

		const title = this.scene.add.text(sc.TAVERN_TITLE_X, sc.TAVERN_TITLE_Y, "Tavern", constants.titleTextConfig);
		this.flyout.add([bg, title]);

		const filtered = Card.getAllCards()
			.filter(card => !state.gameData.player.units.map(u => u.cardId).includes(card.name));

		pickRandom(filtered, 3)
			.forEach((spec, index) => {
				const unit = makeUnit(constants.FORCE_ID_PLAYER, spec.id, vec2(0, 0));
				const charaOptions: CharaOptions = {
					isShopItem: true,
					onPurchased: () => {
						this.scene.events.emit(GameEvents.TOOLTIP_HIDE);
						if (this.flyout) this.flyout.remove(chara);
						// Gold update and adding to player units is handled by Chara.attemptPurchase
					}
				};
				const chara = new Chara(this.scene, unit, charaOptions);

				registerChara(chara);

				chara.setPosition(sc.TAVERN_CHARA_FIRST_X + (index * sc.TAVERN_CHARA_SPACING), sc.TAVERN_CHARA_BASE_Y);
				chara.setBarsVisibility(false);

				this.flyout.add(chara);
				this.currentShopCharas.push(chara);
			});
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
