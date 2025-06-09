import { images } from "../../../assets";
import { getAllCards, getAllRelicDefinitions } from "../../../Models/Card";
import { vec2 } from "../../../Models/Geometry";
import { makeUnit } from "../../../Models/Unit";
import { Flyout } from "../../../Systems/Flyout";
import { pickRandom } from "../../../utils";
import { FORCE_ID_PLAYER, titleTextConfig } from "../constants";
import { addCharaToState } from "./CharaManager";
import { RelicCard } from "./Relic";
import { Chara } from "../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../BattlegroundScene";
import { UIButton } from "./UIButton";

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
	private static readonly TAVERN_BG_WIDTH = 600;
	private static readonly TAVERN_BG_HEIGHT = 400;

	private scene: BattlegroundScene;
	private flyout: Flyout;

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

			// Add a background panel for the entire shop UI within the flyout
			const shopBackground = this.scene.add.graphics()
				.fillStyle(0x2c3e50, 0.95) // A dark slate blue, mostly opaque
				.fillRoundedRect(0, 0, shopPanelWidth, shopPanelHeight, 20); // Rounded rectangle
			this.flyout.add(shopBackground);

			this.renderRelics();
			this.renderTavern();

			const nextRoundBtn = new UIButton(
				this.scene,
				"Next Round",
				shopPanelWidth - 180, // Position X relative to the shop panel's width
				shopPanelHeight - 60,  // Position Y relative to the shop panel's height (for bottom-right)
				async () => {
					await this.flyout.slideOut();
					// removeAll is handled by open() on the next call, so just resolve.
					resolve();
				}
			);
			this.flyout.add(nextRoundBtn);

			this.flyout.slideIn();
		});
	}

	private renderRelics(): void {

		const relicData = pickRandom(getAllRelicDefinitions(), 3);

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRect(0, 0, Shop.RELIC_BG_WIDTH, Shop.RELIC_BG_HEIGHT)
			.setPosition(Shop.RELIC_SECTION_X, Shop.RELIC_SECTION_Y);

		const title = this.scene.add.text(Shop.RELIC_TITLE_X, Shop.RELIC_TITLE_Y, "Relics", titleTextConfig);
		this.flyout.add([bg, title]);

		relicData.forEach((relic, index) => {
			const x = Shop.RELIC_FIRST_ICON_X + (index * Shop.RELIC_ICON_SPACING);
			const y = Shop.RELIC_ICON_BASE_Y;

			const slot = this.scene.add
				.image(x, y, images.slot.key)
				.setDisplaySize(Shop.RELIC_ICON_SIZE, Shop.RELIC_ICON_SIZE);
			const icon = new RelicCard(this.scene, x, y, relic, Shop.RELIC_ICON_SIZE - 40, () => {
				if (this.flyout) this.flyout.remove(icon);
			});

			this.flyout.add([slot, icon]);
		});
	}

	private renderTavern(): void {
		const { state } = this.scene; // Access state via scene

		const bg = this.scene.add.graphics()
			.fillStyle(0x000, 0.5)
			.fillRect(Shop.TAVERN_BG_OFFSET_X, 0, Shop.TAVERN_BG_WIDTH, Shop.TAVERN_BG_HEIGHT)
			.setPosition(Shop.RELIC_SECTION_X, Shop.RELIC_SECTION_Y);

		const title = this.scene.add.text(Shop.TAVERN_TITLE_X, Shop.TAVERN_TITLE_Y, "Tavern", titleTextConfig);
		this.flyout.add([bg, title]);

		const filtered = getAllCards()
			.filter(card => !state.gameData.player.units.map(u => u.cardId).includes(card.name));

		pickRandom(filtered, 3)
			.forEach((spec, index) => {
				const unit = makeUnit(FORCE_ID_PLAYER, spec.id, vec2(0, 0));
				const chara = new Chara(this.scene, unit, { // Pass this.scene as parent
					isShopItem: true,
					onPurchased: () => {
						this.scene.uiManager.tooltip.hide();
						if (this.flyout) this.flyout.remove(chara);
						// Gold update and adding to player units is handled by Chara.attemptPurchase
					}
				});

				addCharaToState(chara);

				chara.setPosition(Shop.TAVERN_CHARA_FIRST_X + (index * Shop.TAVERN_CHARA_SPACING), Shop.TAVERN_CHARA_BASE_Y);
				chara.addTooltip();
				chara.setBarsVisibility(false);

				this.flyout.add(chara);
			});
	}
}
