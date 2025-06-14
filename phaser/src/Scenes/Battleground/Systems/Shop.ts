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

export class Shop {
	// UI Layout Constants for Shop
	private static readonly RELIC_SECTION_X = 50;
	private static readonly RELIC_SECTION_Y = 50;
	private static readonly RELIC_BG_WIDTH = 700;
	private static readonly RELIC_BG_HEIGHT = 400;
	private static readonly RELIC_TITLE_X = Shop.RELIC_SECTION_X + 250;
	private static readonly RELIC_TITLE_Y = Shop.RELIC_SECTION_Y + 20;
	private static readonly RELIC_ICON_BASE_Y = Shop.RELIC_SECTION_Y + 250;
	private static readonly RELIC_ICON_SIZE = 200;
	private static readonly RELIC_ICON_SPACING = 210;
	private static readonly RELIC_FIRST_ICON_X = Shop.RELIC_SECTION_X + 130;

	private static readonly TAVERN_BG_OFFSET_X = 800;
	private static readonly TAVERN_TITLE_X = Shop.RELIC_SECTION_X + Shop.TAVERN_BG_OFFSET_X + 100;
	private static readonly TAVERN_TITLE_Y = Shop.RELIC_SECTION_Y + 10;
	private static readonly TAVERN_CHARA_BASE_Y = Shop.RELIC_SECTION_Y + 250;
	private static readonly TAVERN_CHARA_FIRST_X = Shop.RELIC_SECTION_X + Shop.TAVERN_BG_OFFSET_X + 150;
	private static readonly TAVERN_CHARA_SPACING = 200;
	private static readonly TAVERN_BG_WIDTH = 900;
	private static readonly TAVERN_BG_HEIGHT = 400;

	private static readonly PANEL_BG_COLOR = 0x2c3e50; // Dark slate blue
	private static readonly PANEL_BG_OPACITY = 0.95; // Mostly opaque
	private static readonly PANEL_X = 20;
	private static readonly PANEL_Y = 20;

	private scene: BattlegroundScene;
	private flyout: Flyout;

	// To store references for DebugController and potentially other systems
	private currentShopCharas: Chara[] = [];
	private currentShopRelicCards: RelicCard[] = [];

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.flyout = new Flyout(this.scene, "");
	}

	public open(): Promise<void> {
		return new Promise((resolve) => {

			this.flyout.removeAll(true); // Clear any previous content from the flyout

			// Define the shop panel's dimensions based on its content.
			// These dimensions are relative to the flyout's origin.
			const panelPadding = 25; // Padding around the main content areas
			const shopPanelWidth = Shop.RELIC_SECTION_X + Shop.TAVERN_BG_OFFSET_X + Shop.TAVERN_BG_WIDTH + panelPadding;
			// Height needs to accommodate relic/tavern sections and the button below them.
			const contentHeight = Shop.RELIC_SECTION_Y + Shop.RELIC_BG_HEIGHT;
			const buttonAreaHeight = 100; // Space for the button and some padding
			const shopPanelHeight = contentHeight + buttonAreaHeight + panelPadding;

			// Clear previous shop items
			this.currentShopCharas = [];
			this.currentShopRelicCards = [];

			// Add a background panel for the entire shop UI within the flyout
			const shopBackground = this.scene.add.graphics()
				.fillStyle(Shop.PANEL_BG_COLOR, Shop.PANEL_BG_OPACITY)
				.fillRoundedRect(Shop.PANEL_X, Shop.PANEL_Y, shopPanelWidth, shopPanelHeight, 20); // Rounded rectangle
			this.flyout.add(shopBackground);

			this.renderRelics();
			this.renderTavern();

			const nextRoundBtn = new UIButton(
				this.scene,
				"Next Round",
				shopPanelWidth - 180, // Position X relative to the shop panel's width
				shopPanelHeight - 60,  // Position Y relative to the shop panel's height (for bottom-right)
				async () => {
					this.scene.events.emit(GameEvents.SHOP_PHASE_ENDED);
					await this.flyout.slideOut();
					resolve();
				}
			);
			this.flyout.add(nextRoundBtn);

			this.flyout.slideIn();
		});
	}

	private renderRelics(): void {

		const relicData = pickRandom(Card.getAllRelicDefinitions(), 3);

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRect(0, 0, Shop.RELIC_BG_WIDTH, Shop.RELIC_BG_HEIGHT)
			.setPosition(Shop.RELIC_SECTION_X, Shop.RELIC_SECTION_Y);

		const title = this.scene.add.text(Shop.RELIC_TITLE_X, Shop.RELIC_TITLE_Y, "Relics", constants.titleTextConfig);
		this.flyout.add([bg, title]);

		relicData.forEach((relic, index) => {
			const x = Shop.RELIC_FIRST_ICON_X + (index * Shop.RELIC_ICON_SPACING);
			const y = Shop.RELIC_ICON_BASE_Y;

			const slot = this.scene.add
				.image(x, y, images.slot.key)
				.setDisplaySize(Shop.RELIC_ICON_SIZE, Shop.RELIC_ICON_SIZE);
			const icon = new RelicCard(
				this.scene,
				x, y,
				playerForce.id,
				relic,
				Shop.RELIC_ICON_SIZE - 40, () => {
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
			.fillRect(Shop.TAVERN_BG_OFFSET_X, 0, Shop.TAVERN_BG_WIDTH, Shop.TAVERN_BG_HEIGHT)
			.setPosition(Shop.RELIC_SECTION_X, Shop.RELIC_SECTION_Y);

		const title = this.scene.add.text(Shop.TAVERN_TITLE_X, Shop.TAVERN_TITLE_Y, "Tavern", constants.titleTextConfig);
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

				chara.setPosition(Shop.TAVERN_CHARA_FIRST_X + (index * Shop.TAVERN_CHARA_SPACING), Shop.TAVERN_CHARA_BASE_Y);
				chara.setBarsVisibility(false);

				this.flyout.add(chara);
				this.currentShopCharas.push(chara);
			});
	}

	// --- Methods for DebugController ---

	public getShopCharaBySlot(slotIndex: number): Chara | null {
		return this.currentShopCharas[slotIndex] || null;
	}

	public getShopRelicCardBySlot(slotIndex: number): RelicCard | null {
		return this.currentShopRelicCards[slotIndex] || null;
	}

	/**
	 * Used by DebugController for inspection.
	 */
	public getDisplayedHeroCardDefinitions(): Card.CardDefinition[] {
		return this.currentShopCharas.map(chara => chara.unit.cardId)
			.map(Card.getCardDefinition);
	}

	/**
	 * Used by DebugController for inspection. Assumes RelicCard has a 'relicDefinition' property.
	 */
	public getDisplayedRelicDefinitions(): Card.RelicDefinition[] {
		return this.currentShopRelicCards.map(rc => rc.id)
			.map(Card.getRelicDefinition);
	}

	// --- Event Handlers Moved from BattlegroundEventSystem ---

	public async handleShopOpenUITrigger(): Promise<void> {
		await this.open();
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
