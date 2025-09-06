import * as Card from "@Models/Entities/Card";
import { vec2 } from "@Models/Geometry";
import * as Chara from "@Systems/Chara/Chara";
import * as c from "../../../../constants/constants";
import { createUIButton } from "../../../../UI/UIButton";
import { makeUnit } from "@Models/Entities/Unit";
import * as sc from "./constants";
import { MagicOrb } from "../../../../components/MagicOrb/MagicOrb";
import { renderOrbs } from "./Orbs";
import { scene } from "../../BattlegroundScene";
import { tween } from "../../../../Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import { skillsIndex } from "@Models/Skills";
import { pickOne } from "../../../../utils";

export type ShopUIState = {
	shopContainer: Container;
	sellZoneContainer: Container | null;
	sellZone: Phaser.GameObjects.Zone | null;
	sellZoneText: Phaser.GameObjects.Text | null;
	sellZoneGraphics: Graphics | null;
	magicOrbs: MagicOrb[];
	orbContainer: Container | null;
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
	buttonText: string = "Next Round",
	mode: 'hero' | 'orb' | 'skill' = 'hero',
	onPurchase?: (skillId: string) => void
): { charas: Chara.Chara[] } {
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

	_renderTavernSectionBackgroundAndTitle(state.shopContainer, state.panelX, mode === 'hero' ? "Tavern" : mode === 'orb' ? "Orb Shop" : "Skill Shop");

	if (mode === 'hero') {
		const rerollButtonX = state.panelX + 470;
		const rerollButtonY = sc.PANEL_Y + sc.TAVERN_BG_HEIGHT - 20;
		const rerollBtn = createUIButton(
			scene,
			`Reroll`,
			rerollButtonX,
			rerollButtonY,
			rerollCallback
		);
		state.shopContainer.add(rerollBtn);
	}

	const nextRoundButtonX = c.SCREEN_WIDTH - 200;
	const nextRoundButtonY = c.SCREEN_HEIGHT - 100;
	const nextRoundBtn = createUIButton(
		scene,
		buttonText,
		nextRoundButtonX,
		nextRoundButtonY,
		nextRoundCallback
	);
	state.shopContainer.add(nextRoundBtn);

	if (mode === 'orb') {
		renderOrbs(state, orbs);
	} else if (mode === 'skill' && onPurchase) {
		renderSkills(state, orbs, onPurchase);
	}

	_createSellZone(state);

	const displayedCharas = mode === 'hero' ? renderTavernCharas(cardsToDisplay) : [];

	return { charas: displayedCharas };
}

function _renderTavernSectionBackgroundAndTitle(container: Container, panelX?: number, sectionTitle: string = "Tavern"): void {
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
		sectionTitle,
		c.titleTextConfig
	);

	container.add([bg, title]);
}

export function renderSkills(state: ShopUIState, skills: string[], onPurchase: (skillId: string) => void): void {
	if (!state) throw new Error("ShopUI not initialized. Call create() first.");
	const baseX = state.panelX + 20;
	const baseY = sc.TAVERN_BASE_Y + 50;
	const CIRCLE_RADIUS = 35;
	const CIRCLE_SPACING = 10;
	const totalSkillsWidth = skills.length * (CIRCLE_RADIUS * 2 + CIRCLE_SPACING) - CIRCLE_SPACING;
	const startX = baseX + totalSkillsWidth / 2;

	skills.forEach((skillId, index) => {
		const skill = skillsIndex[skillId];
		if (skill) {
			const x = startX - index * (CIRCLE_RADIUS * 2 + CIRCLE_SPACING);
			const circle = scene.add.circle(x, baseY, CIRCLE_RADIUS, 0x4e9de0, 0.8);
			circle.setStrokeStyle(2, 0xffffff);

			const iconText = getSkillIcon(skillId);

			const text = scene.add.text(x, baseY, iconText, {
				fontSize: '48px',
				color: '#ffffff',
				fontFamily: 'Arial Black',
				stroke: '#000000',
				strokeThickness: 4
			}).setOrigin(0.5);

			circle.setInteractive(
				new Phaser.Geom.Circle(CIRCLE_RADIUS, CIRCLE_RADIUS, CIRCLE_RADIUS),
				Phaser.Geom.Circle.Contains
			);

			circle.on('pointerover', () => {
				// renderTooltip(x, y - 200, skill.name, skill.description);
			});
			circle.on('pointerout', () => {
				// hideTooltip();
			});

			circle.on('pointerdown', () => {
				circle.setScale(0.9);
				text.setScale(0.9);
				onPurchase(skillId);
			});

			circle.on('pointerup', () => {
				circle.setScale(1);
				text.setScale(1);
			});

			state.shopContainer.add(circle);
			state.shopContainer.add(text);
		}
	});
}

function getSkillIcon(_skillId: string): string {
	// placeholder for now
	return pickOne(["⚔️", "☠️"]);
}

export function renderTavernCharas(cardDefs: Card.CardDefinition[]): Chara.Chara[] {
	if (!state) throw new Error("ShopUI not initialized. Call create() first.");
	const createdCharas: Chara.Chara[] = [];
	const baseX = (state.panelX !== undefined ? state.panelX + 160 : sc.TAVERN_CHARA_FIRST_X);
	cardDefs.forEach((spec, index) => {
		const unit = makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0));

		const chara = Chara.create(unit);

		chara.setPosition(baseX + (index * sc.TAVERN_CHARA_SPACING), sc.TAVERN_CHARA_BASE_Y);

		state!.shopContainer.add(chara);
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