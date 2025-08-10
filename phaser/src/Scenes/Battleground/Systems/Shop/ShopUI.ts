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
import { MagicOrb, MagicOrbCallbacks } from "../../../../components/MagicOrb/MagicOrb";
import { hexToVector3 } from "../../../../Utils/colorUtils";

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
		orbs: number[],
		nextRoundCallback: () => void,
		rerollCallback: () => void,
		charaPurchaseFinalized: (purchasedChara: Chara) => void,
	): { charas: Chara[] } {
		this.flyout.removeAll(true); // Clear any previous content


		// Calculate right-aligned X for the shop panel
		const screenWidth = this.scene.cameras.main.width;
		const panelX = screenWidth - sc.SHOP_PANEL_WIDTH - 40; // 40px margin from right
		const shopBackground = this.scene.add.graphics()
			.fillStyle(sc.PANEL_BG_COLOR, sc.PANEL_BG_OPACITY)
			.fillRoundedRect(panelX, sc.PANEL_Y, sc.SHOP_PANEL_WIDTH, sc.SHOP_PANEL_HEIGHT, 20);
		this.flyout.add(shopBackground);


		// Render tavern background and title first, passing panelX for right alignment
		this._renderTavernSectionBackgroundAndTitle(panelX);


		const buttonY = sc.PANEL_Y + sc.SHOP_PANEL_HEIGHT - 100;
		const rerollButtonX = panelX + 190;
		const rerollBtn = new UIButton(
			this.scene,
			`Reroll $${c.SHOP_ITEM_PURCHASE_COST}`,
			rerollButtonX,
			buttonY,
			rerollCallback
		);
		this.flyout.add(rerollBtn);

		const nextRoundButtonX = rerollButtonX + rerollBtn.buttonWidth + 20;
		const nextRoundBtn = new UIButton(
			this.scene,
			"Next Round",
			nextRoundButtonX,
			buttonY,
			nextRoundCallback
		);
		this.flyout.add(nextRoundBtn);

		this._createSellZone();

		// render orbs
		const orbY = sc.PANEL_Y + 520;
		const orbSpacing = 240;
		const orbContainer = this.scene.add.container(0, 0);

		orbs.forEach((orb, index) => {
			const orbX = panelX + 120 + (index * orbSpacing);

			// Create tooltip content based on orb color
			const hexString = orb.toString(16).toUpperCase().padStart(6, '0');
			const orbNames = ['Crimson', 'Emerald', 'Azure', 'Golden', 'Violet'];
			const orbName = orbNames[index] || `Mystical`;

			const magicOrb = new MagicOrb(this.scene, orbX, orbY, {
				size: 200,
				color: hexToVector3(orb), // Using hex format
				intensity: 1.2,
				speed: 1.0,
				enableTooltip: true,
				enableDrag: true, // Enable drag functionality
				returnDuration: 500, // Smooth return animation
				tooltipTitle: `${orbName} Orb`,
				tooltipText: `A sphere of concentrated magical energy pulsing with arcane power.\n\nColor Code: #${hexString}\nEnergy Level: High\nStability: Stable`,
				// Drop callback - determines what happens when orb is dropped on a target
				onDropTarget: (orb, target) => {
					// Get board information if dropped on a board slot
					const Board = require("../../../../Models/Board");
					const playerBoard = Board.getSharedPlayerBoard();

					if (playerBoard && playerBoard.dropZones.includes(target)) {
						const slotIndex = playerBoard.dropZones.indexOf(target);
						const tileX = slotIndex % 3;
						const tileY = Math.floor(slotIndex / 3);

						console.log(`${orbName} Orb dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`);

						// Check if the slot is occupied
						// Access game state to check if there's a unit at this position
						const gameState = this.scene.state;
						const existingUnit = gameState?.gameData?.player?.units?.find((unit: any) =>
							unit.position?.x === tileX && unit.position?.y === tileY
						);

						if (existingUnit) {
							console.log(`Unit ${existingUnit.id} is at this position - applying ${orbName} effect!`);

							magicOrb.startDissolve(); // Start dissolve animation

						} else {
							console.log(`No unit at position [${tileX}, ${tileY}] - orb returns to position`);
							MagicOrbCallbacks.returnToPosition(orb, target);
						}
					} else {
						console.log(`${orbName} Orb dropped on non-board target:`, target.name || target.getData?.('type') || 'unknown');
						// For non-board targets, use simple return behavior
						MagicOrbCallbacks.returnToPosition(orb, target);
					}
				},
				// Note: Board drop zones are automatically detected
				// dropTargetNames can be used for additional custom targets if needed
				dropTargetNames: [] // Empty array - we detect board zones automatically
			});

			// Add the orb's shader to the container
			orbContainer.add(magicOrb.getShader());
		}); this.flyout.add(orbContainer);

		// Render characters AFTER buttons to ensure they appear on top
		const displayedCharas = this._renderTavernCharas(cardsToDisplay, charaPurchaseFinalized, panelX);

		return { charas: displayedCharas };
	}


	/**
	 * Renders the tavern section of the shop, including its background, title, and character cards.
	 * This method is called during the initial display of the shop.
	 * @param cardDefs An array of `Card.CardDefinition` objects representing the characters to display.
	 * @param charaPurchaseFinalized Callback function invoked when a character is successfully purchased.
	 * @param panelX The X position for right-aligned shop panel.
	 * @returns An array of the created `Chara` instances.
	 */
	_renderTavernUI(
		cardDefs: Card.CardDefinition[],
		charaPurchaseFinalized: (purchasedChara: Chara) => void,
		panelX: number
	): Chara[] {
		this._renderTavernSectionBackgroundAndTitle(panelX);
		return this._renderTavernCharas(cardDefs, charaPurchaseFinalized, panelX);
	}


	_renderTavernSectionBackgroundAndTitle(panelX?: number): void {
		// Default to left if not provided
		const tavernBaseX = (panelX !== undefined ? panelX + 20 : sc.TAVERN_BASE_X);
		const tavernBaseY = sc.TAVERN_BASE_Y;

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRoundedRect(
				0, 0,
				sc.TAVERN_BG_WIDTH, sc.TAVERN_BG_HEIGHT,
				sc.SUB_PANEL_CORNER_RADIUS
			)
			.setPosition(tavernBaseX, tavernBaseY);

		const title = this.scene.add.text(
			tavernBaseX + 30, sc.TAVERN_TITLE_Y,
			"Tavern",
			c.titleTextConfig
		);

		this.flyout.add([bg, title]);
	}


	_renderTavernCharas(
		cardDefs: Card.CardDefinition[],
		charaPurchaseFinalized: (purchasedChara: Chara) => void,
		panelX?: number
	): Chara[] {
		const createdCharas: Chara[] = [];
		const baseX = (panelX !== undefined ? panelX + 160 : sc.TAVERN_CHARA_FIRST_X);
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

			chara.setPosition(baseX + (index * sc.TAVERN_CHARA_SPACING), sc.TAVERN_CHARA_BASE_Y);
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
		const sellZoneX = c.SCREEN_WIDTH - sc.SELL_ZONE_WIDTH - 20; // Small margin from left edge
		const sellZoneY = this.scene.cameras.main.height - sc.SELL_ZONE_HEIGHT - 20; // Small margin from bottom

		// Create the zone with its center aligned with the visual graphics' center
		this.sellZone = this.scene.add.zone(
			sellZoneX + sc.SELL_ZONE_WIDTH / 2,
			sellZoneY + sc.SELL_ZONE_HEIGHT / 2,
			sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT
		);
		this.sellZone.setName(sc.SHOP_SELL_ZONE_NAME); // Set name for drop target identification

		this.sellZoneGraphics = this.scene.add.graphics({ x: sellZoneX, y: sellZoneY });
		// Draw drop shadow
		this.sellZoneGraphics.save();
		this.sellZoneGraphics.fillStyle(0x000000, 0.25); // Shadow color and alpha
		this.sellZoneGraphics.fillRoundedRect(6, 6, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);
		this.sellZoneGraphics.restore();

		// Draw main background
		this.sellZoneGraphics.lineStyle(4, 0xffffff, 0.8); // White border
		this.sellZoneGraphics.fillStyle(sc.SELL_ZONE_BG_COLOR, sc.SELL_ZONE_BG_ALPHA);
		this.sellZoneGraphics.fillRoundedRect(0, 0, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);
		this.sellZoneGraphics.strokeRoundedRect(0, 0, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);

		// Make the graphics object the drop zone
		//this.sellZone.setInteractive();
		this.sellZone.setRectangleDropZone(sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT);

		this.sellZoneText = this.scene.add.text(
			sellZoneX + sc.SELL_ZONE_WIDTH / 2,
			sellZoneY + sc.SELL_ZONE_HEIGHT / 2,
			sc.SELL_ZONE_TEXT,
			{
				...c.defaultTextConfig,
				...sc.SELL_ZONE_TEXT_STYLE,
				fontSize: '40px', // Larger text
				fontStyle: 'bold',
				color: '#fff',
				stroke: '#222',
				strokeThickness: 6,
				shadow: {
					offsetX: 2,
					offsetY: 2,
					color: '#000',
					blur: 4,
					fill: true
				}
			}
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