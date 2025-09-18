import * as Card from "@Models/Entities/Card";
import { vec2 } from "@Models/Geometry";
import * as Chara from "@Systems/Chara/Chara";
import * as c from "../../../../constants/constants";
import { createUIButton } from "../../../../UI/UIButton";
import { makeUnit } from "@Models/Entities/Unit";
import * as sc from "./constants";
import { MagicOrb } from "../../../../components/MagicOrb/MagicOrb";
import { scene } from "../../BattlegroundScene";
import { tween } from "../../../../Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import { pickOne } from "../../../../utils";
import { hideTooltip, renderTooltip } from "@UI/Tooltip";
import { skillsIndex } from "@Models/Skills";

const NEXT_ROUND_BUTTON_X = c.SCREEN_WIDTH - 200;
const NEXT_ROUND_BUTTON_Y = c.SCREEN_HEIGHT - 100;
const SKILL_CIRCLE_RADIUS = 35 * 1.5;
const SKILL_CIRCLE_SPACING = 10;
const SKILL_CIRCLE_SCALE = 1.5;
const SKILL_TEXT_SCALE = 1.5;
const SKILL_CLICK_SCALE = 0.9;
const SKILL_CLICK_TEXT_SCALE = 1.35;
const SKILL_ICON_FONT_SIZE = '48px';
const SELL_ZONE_TEXT_FONT_SIZE = '40px';

export { createUIButton };

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
	nextRoundButton: Phaser.GameObjects.Container | null;
	skillCircles: Phaser.GameObjects.Arc[];
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
		nextRoundButton: null,
		skillCircles: [],
	};

	state.shopContainer.setY(c.SCREEN_HEIGHT * -1);

	return state;
};

export function displayCommonShop(
	nextRoundCallback: () => void,
	buttonText: string = "Next Round"
): void {
	if (!state) throw new Error("ShopUI not initialized. Call create() first.");
	state.shopContainer.removeAll(true);
	state.magicOrbs = [];
	state.skillCircles = [];

	if (state.orbContainer) {
		state.orbContainer.destroy(true);
		state.orbContainer = null;
	}

	const screenWidth = scene.cameras.main.width;
	state.panelX = screenWidth - sc.SHOP_PANEL_WIDTH - 40;

	_renderTavernSectionBackgroundAndTitle(state.shopContainer, state.panelX);

	const nextRoundBtn = createUIButton(
		scene,
		buttonText,
		NEXT_ROUND_BUTTON_X,
		NEXT_ROUND_BUTTON_Y,
		nextRoundCallback
	);
	state.shopContainer.add(nextRoundBtn);
	state.nextRoundButton = nextRoundBtn;

	_createSellZone(state);
}

function _renderTavernSectionBackgroundAndTitle(container: Container, panelX?: number): void {
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

	container.add([bg]);
}

export function renderSkills(skills: string[], onPurchase: (skillId: string) => void | Promise<void>): void {
	if (!state) throw new Error("ShopUI not initialized. Call create() first.");
	const baseX = state.panelX + 20;
	const baseY = sc.TAVERN_BASE_Y + 50;
	const totalSkillsWidth = skills.length * (SKILL_CIRCLE_RADIUS * 2 + SKILL_CIRCLE_SPACING) - SKILL_CIRCLE_SPACING;
	const startX = baseX + totalSkillsWidth / 2;

	skills.forEach((skillId, index) => {
		const skill = skillsIndex[skillId];
		if (skill) {
			const x = startX - index * (SKILL_CIRCLE_RADIUS * 2 + SKILL_CIRCLE_SPACING);
			const circle = scene.add.circle(x, baseY, SKILL_CIRCLE_RADIUS, 0x4e9de0, 0.8);
			circle.setStrokeStyle(2, 0xffffff);

			const iconText = getSkillIcon(skillId);

			const text = scene.add.text(x, baseY, iconText, {
				fontSize: SKILL_ICON_FONT_SIZE,
				color: '#ffffff',
				fontFamily: 'Arial Black',
				stroke: '#000000',
				strokeThickness: 4
			}).setOrigin(0.5);
			text.setScale(1.5); // Larger scale

			circle.setInteractive(
				new Phaser.Geom.Circle(SKILL_CIRCLE_RADIUS, SKILL_CIRCLE_RADIUS, SKILL_CIRCLE_RADIUS),
				Phaser.Geom.Circle.Contains
			);

			circle.on('pointerover', () => {
				renderTooltip(x, baseY - 200, skill.name, skill.description);
			});
			circle.on('pointerout', () => {
				hideTooltip();
			});

			circle.on('pointerdown', () => {
				circle.setScale(SKILL_CLICK_SCALE);
				text.setScale(SKILL_CLICK_TEXT_SCALE);
				onPurchase(skillId);
			});

			circle.on('pointerup', () => {
				circle.setScale(SKILL_CIRCLE_SCALE);
				text.setScale(SKILL_TEXT_SCALE);
			});

			state!.shopContainer.add(circle);
			state!.shopContainer.add(text);
			state!.skillCircles.push(circle);
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
	const ownedCardIds = new Set(scene.state.gameData.player.units.map(u => u.cardId));

	cardDefs.forEach((spec, index) => {
		const unit = makeUnit(c.FORCE_ID_PLAYER, spec.id, vec2(0, 0));

		const chara = Chara.create(unit);

		chara.setPosition(baseX + (index * sc.TAVERN_CHARA_SPACING), sc.TAVERN_CHARA_BASE_Y);

		if (ownedCardIds.has(spec.id)) {
			const borderRadius = (c.TILE_WIDTH * 0.8) / 2;
			const animatedBorder = scene.add.graphics();
			animatedBorder.lineStyle(2, 0xffd700, 1);
			animatedBorder.strokeCircle(0, 0, borderRadius);
			chara.add(animatedBorder);
			chara.bringToTop(chara.list[chara.list.length - 2]);

			let currentWidth = 2;
			scene.tweens.add({
				targets: { width: currentWidth },
				width: 6,
				duration: 1000,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				onUpdate: (tween) => {
					const newWidth = tween.getValue();
					animatedBorder.clear();
					animatedBorder.lineStyle(newWidth, 0xffd700, 1);
					animatedBorder.strokeCircle(0, 0, borderRadius);
				}
			});
		}

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
			fontSize: SELL_ZONE_TEXT_FONT_SIZE,
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

export function getState(): ShopUIState | null {
	return state;
}

export function disableSkillCircles(): void {
	if (state?.skillCircles) {
		state.skillCircles.forEach(circle => {
			circle.disableInteractive();
			circle.setAlpha(0.5);
		});
	}
}

export function disableNextRoundButton(): void {
	if (state?.nextRoundButton) {
		const buttonGraphics = state.nextRoundButton.getByName("buttonBackground") as Phaser.GameObjects.Graphics;
		const buttonLabel = state.nextRoundButton.getByName("buttonLabel") as Phaser.GameObjects.Text;
		if (buttonGraphics) {
			buttonGraphics.disableInteractive();
			buttonGraphics.setAlpha(0.5);
		}
		if (buttonLabel) {
			buttonLabel.setAlpha(0.5);
		}
		state.nextRoundButton.setAlpha(0.5);
	}
}

export function addToShopContainer(child: Phaser.GameObjects.GameObject): void {
	if (state) {
		state.shopContainer.add(child);
	}
}