import * as Card from "../../../../Models/Entities/Card";
import { vec2 } from "../../../../Models/Geometry";
import { registerChara } from "../CharaManager";
import { Chara, CharaOptions } from "../../../../Systems/Chara/Chara";
import * as c from "../../../../constants/constants";
import { createUIButton } from "../../../../UI/UIButton";
import { makeUnit } from "../../../../Models/Entities/Unit";
import * as sc from "./ShopConstants";
import { MagicOrb } from "../../../../components/MagicOrb/MagicOrb";
import { renderOrbs } from "./Orbs";
import { scene } from "../../BattlegroundScene";
import { tween } from "../../../../Utils/animation";
import * as AudioManager from "../../../../Systems/AudioManager";

export type ShopUIState = {
	shopContainer: Phaser.GameObjects.Container;
	sellZoneContainer: Phaser.GameObjects.Container | null;
	sellZone: Phaser.GameObjects.Zone | null;
	sellZoneText: Phaser.GameObjects.Text | null;
	sellZoneGraphics: Phaser.GameObjects.Graphics | null;
	magicOrbs: MagicOrb[];
	orbContainer: Phaser.GameObjects.Container | null;
	panelX: number;
	isOpen: boolean;
}
let state: ShopUIState | null = null;

export function create() {
	state = {
		shopContainer: scene.add.container(0, 0),
		sellZoneContainer: null,
		sellZone: null,
		sellZoneText: null,
		sellZoneGraphics: null,
		magicOrbs: [],
		orbContainer: null,
		panelX: 0,
		isOpen: false,
	};

	state.shopContainer.setY(c.SCREEN_HEIGHT * -1);

	return state;
};

export function displayShop(
	cardsToDisplay: Card.CardDefinition[],
	orbs: string[],
	nextRoundCallback: () => void,
	rerollCallback: () => void,
): { charas: Chara[] } {
	if (!state) throw new Error("ShopUI not initialized. Call create() first.");
	state.shopContainer.removeAll(true);
	state.magicOrbs = [];

	if (state.orbContainer) {
		state.orbContainer.destroy(true);
		state.orbContainer = null;
	}

	const screenWidth = scene.cameras.main.width;
	state.panelX = screenWidth - sc.SHOP_PANEL_WIDTH - 40;
	const shopBackground = scene.add.graphics()
		.fillStyle(sc.PANEL_BG_COLOR, sc.PANEL_BG_OPACITY)
		.fillRoundedRect(state.panelX, sc.PANEL_Y, sc.SHOP_PANEL_WIDTH, sc.SHOP_PANEL_HEIGHT, 20);
	state.shopContainer.add(shopBackground);

	_renderTavernSectionBackgroundAndTitle(state.shopContainer, state.panelX);

	const rerollButtonX = state.panelX + 470;
	const rerollButtonY = sc.PANEL_Y + sc.TAVERN_BG_HEIGHT - 20;
	const rerollBtn = createUIButton(
		scene,
		`Reroll $${c.SHOP_ITEM_PURCHASE_COST}`,
		rerollButtonX,
		rerollButtonY,
		rerollCallback
	);
	state.shopContainer.add(rerollBtn);

	const nextRoundButtonX = c.SCREEN_WIDTH - 200;
	const nextRoundButtonY = c.SCREEN_HEIGHT - 100;
	const nextRoundBtn = createUIButton(
		scene,
		"Next Round",
		nextRoundButtonX,
		nextRoundButtonY,
		nextRoundCallback
	);
	state.shopContainer.add(nextRoundBtn);

	renderOrbs(state, orbs);

	_createSellZone(state);

	const displayedCharas = renderTavernCharas(cardsToDisplay);

	return { charas: displayedCharas };
}

function _renderTavernSectionBackgroundAndTitle(container: Phaser.GameObjects.Container, panelX?: number): void {
	const tavernBaseX = (panelX !== undefined ? panelX + 20 : sc.TAVERN_BASE_X);
	const tavernBaseY = sc.TAVERN_BASE_Y;

	const bg = scene.add.graphics()
		.fillStyle(0x000, 0.5)
		.fillRoundedRect(
			0, 0,
			sc.TAVERN_BG_WIDTH, sc.TAVERN_BG_HEIGHT,
			sc.SUB_PANEL_CORNER_RADIUS
		)
		.setPosition(tavernBaseX, tavernBaseY);

	const title = scene.add.text(
		tavernBaseX + 30, sc.TAVERN_TITLE_Y,
		"Tavern",
		c.titleTextConfig
	);

	container.add([bg, title]);
}

export function renderTavernCharas(cardDefs: Card.CardDefinition[]): Chara[] {
	if (!state) throw new Error("ShopUI not initialized. Call create() first.");
	const createdCharas: Chara[] = [];
	const baseX = (state.panelX !== undefined ? state.panelX + 160 : sc.TAVERN_CHARA_FIRST_X);
	cardDefs.forEach((spec, index) => {
		const unit = makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0));
		const charaOptions: CharaOptions = {
			isShopItem: true,

		};
		const chara = new Chara(unit, charaOptions);
		registerChara(chara);

		chara.container.setPosition(baseX + (index * sc.TAVERN_CHARA_SPACING), sc.TAVERN_CHARA_BASE_Y);
		chara.setBarsVisibility(false);

		state!.shopContainer.add(chara.container);
		createdCharas.push(chara);
	});
	return createdCharas;
}

function _createSellZone(state: ShopUIState): void {
	if (state.sellZoneContainer) {
		state.sellZoneContainer.destroy(true);
	}

	state.sellZoneContainer = scene.add.container(0, 0);
	state.sellZoneContainer.setVisible(false);

	const sellZoneX = sc.PANEL_X + sc.SHOP_PANEL_WIDTH / 2 - 40;
	const sellZoneY = sc.PANEL_Y;

	state.sellZone = scene.add.zone(
		sellZoneX + sc.SELL_ZONE_WIDTH / 2,
		sellZoneY + sc.SELL_ZONE_HEIGHT / 2,
		sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT
	);
	state.sellZone.setName(sc.SHOP_SELL_ZONE_NAME);

	state.sellZoneGraphics = scene.add.graphics({ x: sellZoneX, y: sellZoneY });
	state.sellZoneGraphics.save();
	state.sellZoneGraphics.fillStyle(0x000000, 0.25);
	state.sellZoneGraphics.fillRoundedRect(6, 6, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);
	state.sellZoneGraphics.restore();

	state.sellZoneGraphics.lineStyle(4, 0xffffff, 0.8);
	state.sellZoneGraphics.fillStyle(sc.SELL_ZONE_BG_COLOR, sc.SELL_ZONE_BG_ALPHA);
	state.sellZoneGraphics.fillRoundedRect(0, 0, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);
	state.sellZoneGraphics.strokeRoundedRect(0, 0, sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT, sc.SELL_ZONE_CORNER_RADIUS);

	state.sellZone.setRectangleDropZone(sc.SELL_ZONE_WIDTH, sc.SELL_ZONE_HEIGHT);

	state.sellZoneText = scene.add.text(
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

	state.sellZoneContainer.add([state.sellZone, state.sellZoneGraphics, state.sellZoneText]);

}

export function showSellZone(): void {
	if (!state) return;
	if (state.sellZoneContainer) {
		scene.children.bringToTop(state.sellZoneContainer);
		state.sellZoneContainer.setVisible(true);
	}
}

export function hideSellZone(): void {
	state?.sellZoneContainer?.setVisible(false);
}

export function update(time: number): void {
	if (!state) return;
	state.magicOrbs = state.magicOrbs.filter(orb => !orb.isOrbDestroyed());
	state.magicOrbs.forEach(orb => orb.update(time));
}

export function destroyOrbs(): void {
	if (!state) return;
	state.magicOrbs.forEach(orb => {
		if (!orb.isOrbDestroyed()) {
			orb.destroy();
		}
	});
	state.magicOrbs = [];

	if (state.orbContainer) {
		state.orbContainer.destroy(true);
		state.orbContainer = null;
	}
}

export function destroy(): void {
	if (!state) return;
	destroyOrbs();
	state.sellZoneContainer?.destroy(true);
	state.sellZoneContainer = null;
}


export async function slideIn(): Promise<void> {
	if (!state) throw new Error("ShopUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_enter');
	scene.children.bringToTop(state.shopContainer);
	await tween({ targets: [state.shopContainer], y: 0 });
	state.isOpen = true;
}

export async function slideOut(): Promise<void> {
	if (!state) throw new Error("ShopUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_exit');
	await tween({ targets: [state.shopContainer], y: c.SCREEN_HEIGHT * -1 });
	state.isOpen = false;
}

export function bringShopChildToTop(child: Phaser.GameObjects.GameObject): void {
	if (!state) return;
	state.shopContainer.bringToTop(child);
}

export function removeShopChild(child: Phaser.GameObjects.GameObject, destroy: boolean = false): void {
	if (!state) return;
	state.shopContainer.remove(child, destroy);
}

export function getIsShopOpen(): boolean {
	return !!state?.isOpen;
}