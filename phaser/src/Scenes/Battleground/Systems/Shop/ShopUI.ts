import * as Card from "../../../../Models/Entities/Card";
import { vec2 } from "../../../../Models/Geometry";
import { Flyout } from "../../../../UI/Flyout";
import { registerChara } from "../CharaManager";
import { Chara, CharaOptions } from "../../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../../BattlegroundScene";
import { GameEvents } from "../../../../constants/events";
import * as c from "../../../../constants/constants";
import { UIButton } from "../../../../UI/UIButton";
import { makeUnit } from "../../../../Models/Entities/Unit";
import * as sc from "./ShopConstants";

export class ShopUI {
	scene: BattlegroundScene;
	flyout: Flyout;
	sellZoneContainer: Phaser.GameObjects.Container | null = null;
	sellZone: Phaser.GameObjects.Zone | null = null;
	sellZoneText: Phaser.GameObjects.Text | null = null;
	sellZoneGraphics: Phaser.GameObjects.Graphics | null = null;

	constructor(scene: BattlegroundScene, flyout: Flyout) {
		this.scene = scene;
		this.flyout = flyout;
	}


	/**
	 * Clears and re-renders only the character cards in the tavern section of the shop.
	 * Assumes the tavern background and title are already present and should not be recreated.
	 * This method is called when the player rerolls the tavern.
	 * @param cardDefs The new card definitions to display in the tavern.
	 * @param charaPurchaseFinalized Callback function invoked when a character is successfully purchased from the tavern.
	 *                               This allows the `Shop` class to update its list of `currentShopCharas`.
	 * @returns An array of the newly created `Chara` instances that are now displayed in the tavern.
	 */
	rerenderTavernCharas(
		cardDefs: Card.CardDefinition[],
		charaPurchaseFinalized: (purchasedChara: Chara) => void
	): Chara[] {
		const newCharas = this._renderTavernCharas(cardDefs, charaPurchaseFinalized);
		return newCharas;
	}
	displayShop(
		cardsToDisplay: Card.CardDefinition[],
		nextRoundCallback: () => void,
		rerollCallback: () => void,
		charaPurchaseFinalized: (purchasedChara: Chara) => void,
	): { charas: Chara[] } {
		this.flyout.removeAll(true); // Clear any previous content

		const shopBackground = this.scene.add.graphics()
			.fillStyle(sc.PANEL_BG_COLOR, sc.PANEL_BG_OPACITY)
			.fillRoundedRect(sc.PANEL_X, sc.PANEL_Y, sc.SHOP_PANEL_WIDTH, sc.SHOP_PANEL_HEIGHT, 20);
		this.flyout.add(shopBackground);
		const displayedCharas = this._renderTavernUI(cardsToDisplay, charaPurchaseFinalized);

		const buttonY = sc.PANEL_Y + sc.SHOP_PANEL_HEIGHT - 100;
		// Estimate button width + spacing to position reroll button to the left
		const rerollButtonX = sc.PANEL_X + 190; // Adjust this offset as needed for desired spacing and button width
		const rerollBtn = new UIButton(
			this.scene,
			`Reroll $${c.SHOP_ITEM_PURCHASE_COST}`,
			rerollButtonX,
			buttonY,
			rerollCallback
		);
		this.flyout.add(rerollBtn);

		const nextRoundButtonX = rerollButtonX + rerollBtn.buttonWidth + 20; // 20px spacing after reroll button
		const nextRoundBtn = new UIButton(
			this.scene,
			"Next Round",
			nextRoundButtonX,
			buttonY,
			nextRoundCallback
		);
		this.flyout.add(nextRoundBtn);

		this._createSellZone();

		return { charas: displayedCharas };
	}

	/**
	 * Renders the tavern section of the shop, including its background, title, and character cards.
	 * This method is called during the initial display of the shop.
	 * @param cardDefs An array of `Card.CardDefinition` objects representing the characters to display.
	 * @param charaPurchaseFinalized Callback function invoked when a character is successfully purchased.
	 * @returns An array of the created `Chara` instances.
	 */
	_renderTavernUI(
		cardDefs: Card.CardDefinition[],
		charaPurchaseFinalized: (purchasedChara: Chara) => void
	): Chara[] {
		this._renderTavernSectionBackgroundAndTitle();
		return this._renderTavernCharas(cardDefs, charaPurchaseFinalized);
	}

	_renderTavernSectionBackgroundAndTitle(): void {

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRoundedRect(
				0, 0,
				sc.TAVERN_BG_WIDTH, sc.TAVERN_BG_HEIGHT,
				sc.SUB_PANEL_CORNER_RADIUS
			)
			.setPosition(sc.TAVERN_BASE_X, sc.TAVERN_BASE_Y);

		const title = this.scene.add.text(
			sc.TAVERN_TITLE_X, sc.TAVERN_TITLE_Y,
			"Tavern",
			c.titleTextConfig
		);

		this.flyout.add([bg, title]);
	}

	_renderTavernCharas(
		cardDefs: Card.CardDefinition[],
		charaPurchaseFinalized: (purchasedChara: Chara) => void
	): Chara[] {
		const createdCharas: Chara[] = [];
		cardDefs.forEach((spec, index) => {
			const unit = makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0)); // Position is relative to flyout, set later
			const charaOptions: CharaOptions = {
				isShopItem: true,
				onPurchased: () => { // Called by Chara.finalizePurchase
					this.scene.events.emit(GameEvents.TOOLTIP_HIDE);
					this.flyout.remove(chara); // Remove from flyout display
					// The Chara instance itself will be destroyed by CharaManager via event.
					// We call charaPurchaseFinalized to let Shop update its internal list.
					charaPurchaseFinalized(chara);
				}
			};
			const chara = new Chara(this.scene, unit, charaOptions);
			registerChara(chara); // Register with CharaManager

			chara.setPosition(sc.TAVERN_CHARA_FIRST_X + (index * sc.TAVERN_CHARA_SPACING), sc.TAVERN_CHARA_BASE_Y);
			chara.setBarsVisibility(false);

			this.flyout.add(chara);
			createdCharas.push(chara);
		});
		return createdCharas;
	}

	_createSellZone(): void {
		if (this.sellZoneContainer) {
			this.sellZoneContainer.destroy(true);
		}

		this.sellZoneContainer = this.scene.add.container(0, 0);
		this.sellZoneContainer.setVisible(false); // Initially hidden

		// Position sell zone in the lower left of the screen
		const sellZoneX = 20; // Small margin from left edge
		const sellZoneY = this.scene.cameras.main.height - sc.SELL_ZONE_HEIGHT - 20; // Small margin from bottom

		// Create the zone with its center aligned with the visual graphics' center
		this.sellZone = this.scene.add.zone(
			sellZoneX + sc.SELL_ZONE_WIDTH / 2,
			sellZoneY + sc.SELL_ZONE_HEIGHT / 2,
			sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT
		);
		this.sellZone.setName(sc.SHOP_SELL_ZONE_NAME); // Set name for drop target identification

		this.sellZoneGraphics = this.scene.add.graphics({ x: sellZoneX, y: sellZoneY });
		this.sellZoneGraphics.fillStyle(sc.SELL_ZONE_BG_COLOR, sc.SELL_ZONE_BG_ALPHA);
		this.sellZoneGraphics.fillRoundedRect(0, 0, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);

		// Make the graphics object the drop zone
		//this.sellZone.setInteractive();
		this.sellZone.setRectangleDropZone(sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT);

		this.sellZoneText = this.scene.add.text(
			sellZoneX + sc.SELL_ZONE_WIDTH / 2,
			sellZoneY + sc.SELL_ZONE_HEIGHT / 2,
			sc.SELL_ZONE_TEXT,
			{ ...c.defaultTextConfig, ...sc.SELL_ZONE_TEXT_STYLE }
		).setOrigin(0.5);

		this.sellZoneContainer.add([this.sellZone, this.sellZoneGraphics, this.sellZoneText]);
		this.flyout.add(this.sellZoneContainer);
	}

	showSellZone(): void {
		if (this.sellZoneContainer) {
			this.flyout.bringToTop(this.sellZoneContainer); // Ensure it's visible above other shop items
			this.sellZoneContainer.setVisible(true);
		}
	}

	hideSellZone(): void {
		this.sellZoneContainer?.setVisible(false);
	}

	destroy() {
		this.sellZoneContainer?.destroy(true);
		this.sellZoneContainer = null;
	}
}