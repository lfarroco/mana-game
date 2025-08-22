import * as Card from "../../../../Models/Entities/Card";
import { vec2 } from "../../../../Models/Geometry";
import { Flyout } from "../../../../UI/Flyout";
import { registerChara } from "../CharaManager";
import { Chara, CharaOptions } from "../../../../Systems/Chara/Chara";
import { BattlegroundScene } from "../../BattlegroundScene";
import * as c from "../../../../constants/constants";
import { UIButton } from "../../../../UI/UIButton";
import { makeUnit } from "../../../../Models/Entities/Unit";
import * as sc from "./ShopConstants";
import { MagicOrb } from "../../../../components/MagicOrb/MagicOrb";
import { renderOrbs } from "./Orbs";

export class ShopUI {
	scene: BattlegroundScene;
	flyout: Flyout;
	sellZoneContainer: Phaser.GameObjects.Container | null = null;
	sellZone: Phaser.GameObjects.Zone | null = null;
	sellZoneText: Phaser.GameObjects.Text | null = null;
	sellZoneGraphics: Phaser.GameObjects.Graphics | null = null;
	magicOrbs: MagicOrb[] = [];
	orbContainer: Phaser.GameObjects.Container | null = null;
	panelX: number;

	constructor(scene: BattlegroundScene, flyout: Flyout) {
		this.scene = scene;
		this.flyout = flyout;
	}

	rerenderTavernCharas(
		cardDefs: Card.CardDefinition[],
	): Chara[] {
		const newCharas = this._renderTavernCharas(cardDefs);
		return newCharas;
	}
	displayShop(
		cardsToDisplay: Card.CardDefinition[],
		orbs: string[],
		nextRoundCallback: () => void,
		rerollCallback: () => void,
	): { charas: Chara[] } {
		this.flyout.removeAll(true);
		this.magicOrbs = [];

		if (this.orbContainer) {
			this.orbContainer.destroy(true);
			this.orbContainer = null;
		}

		const screenWidth = this.scene.cameras.main.width;
		this.panelX = screenWidth - sc.SHOP_PANEL_WIDTH - 40;
		const shopBackground = this.scene.add.graphics()
			.fillStyle(sc.PANEL_BG_COLOR, sc.PANEL_BG_OPACITY)
			.fillRoundedRect(this.panelX, sc.PANEL_Y, sc.SHOP_PANEL_WIDTH, sc.SHOP_PANEL_HEIGHT, 20);
		this.flyout.add(shopBackground);

		this._renderTavernSectionBackgroundAndTitle(this.panelX);

		const rerollButtonX = this.panelX + 470;
		const rerollButtonY = sc.PANEL_Y + sc.TAVERN_BG_HEIGHT - 20;
		const rerollBtn = new UIButton(
			this.scene,
			`Reroll $${c.SHOP_ITEM_PURCHASE_COST}`,
			rerollButtonX,
			rerollButtonY,
			rerollCallback
		);
		this.flyout.add(rerollBtn);

		const nextRoundButtonX = c.SCREEN_WIDTH - 200;
		const nextRoundButtonY = c.SCREEN_HEIGHT - 100;
		const nextRoundBtn = new UIButton(
			this.scene,
			"Next Round",
			nextRoundButtonX,
			nextRoundButtonY,
			nextRoundCallback
		);
		this.flyout.add(nextRoundBtn);

		this.renderOrbSection(orbs);

		this._createSellZone();

		const displayedCharas = this._renderTavernCharas(cardsToDisplay);

		return { charas: displayedCharas };
	}


	renderOrbSection(orbs: string[]) {
		renderOrbs(this, orbs);
	}

	_renderTavernUI(
		cardDefs: Card.CardDefinition[],
		panelX: number
	): Chara[] {
		this._renderTavernSectionBackgroundAndTitle(panelX);
		return this._renderTavernCharas(cardDefs);
	}


	_renderTavernSectionBackgroundAndTitle(panelX?: number): void {
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
	): Chara[] {
		const createdCharas: Chara[] = [];
		const baseX = (this.panelX !== undefined ? this.panelX + 160 : sc.TAVERN_CHARA_FIRST_X);
		cardDefs.forEach((spec, index) => {
			const unit = makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0));
			const charaOptions: CharaOptions = {
				isShopItem: true,

			};
			const chara = new Chara(unit, charaOptions);
			registerChara(chara);

			chara.container.setPosition(baseX + (index * sc.TAVERN_CHARA_SPACING), sc.TAVERN_CHARA_BASE_Y);
			chara.setBarsVisibility(false);

			this.flyout.add(chara.container);
			createdCharas.push(chara);
		});
		return createdCharas;
	}

	_createSellZone(): void {
		if (this.sellZoneContainer) {
			this.sellZoneContainer.destroy(true);
		}

		this.sellZoneContainer = this.scene.add.container(0, 0);
		this.sellZoneContainer.setVisible(false);

		const sellZoneX = sc.PANEL_X + sc.SHOP_PANEL_WIDTH / 2 - 40;
		const sellZoneY = sc.PANEL_Y;

		this.sellZone = this.scene.add.zone(
			sellZoneX + sc.SELL_ZONE_WIDTH / 2,
			sellZoneY + sc.SELL_ZONE_HEIGHT / 2,
			sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT
		);
		this.sellZone.setName(sc.SHOP_SELL_ZONE_NAME);

		this.sellZoneGraphics = this.scene.add.graphics({ x: sellZoneX, y: sellZoneY });
		this.sellZoneGraphics.save();
		this.sellZoneGraphics.fillStyle(0x000000, 0.25);
		this.sellZoneGraphics.fillRoundedRect(6, 6, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);
		this.sellZoneGraphics.restore();

		this.sellZoneGraphics.lineStyle(4, 0xffffff, 0.8);
		this.sellZoneGraphics.fillStyle(sc.SELL_ZONE_BG_COLOR, sc.SELL_ZONE_BG_ALPHA);
		this.sellZoneGraphics.fillRoundedRect(0, 0, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);
		this.sellZoneGraphics.strokeRoundedRect(0, 0, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);

		this.sellZone.setRectangleDropZone(sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT);

		this.sellZoneText = this.scene.add.text(
			sellZoneX + sc.SELL_ZONE_WIDTH / 2,
			sellZoneY + sc.SELL_ZONE_HEIGHT / 2,
			sc.SELL_ZONE_TEXT,
			{
				...c.defaultTextConfig,
				...sc.SELL_ZONE_TEXT_STYLE,
				fontSize: '40px',
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

	}

	showSellZone(): void {
		if (this.sellZoneContainer) {
			this.scene.children.bringToTop(this.sellZoneContainer);
			this.sellZoneContainer.setVisible(true);
		}
	}

	hideSellZone(): void {
		this.sellZoneContainer?.setVisible(false);
	}

	update(time: number): void {
		this.magicOrbs = this.magicOrbs.filter(orb => !orb.isOrbDestroyed());
		this.magicOrbs.forEach(orb => orb.update(time));
	}

	destroyOrbs() {
		this.magicOrbs.forEach(orb => {
			if (!orb.isOrbDestroyed()) {
				orb.destroy();
			}
		});
		this.magicOrbs = [];

		if (this.orbContainer) {
			this.orbContainer.destroy(true);
			this.orbContainer = null;
		}
	}

	destroy() {
		this.destroyOrbs();
		this.sellZoneContainer?.destroy(true);
		this.sellZoneContainer = null;
	}
}