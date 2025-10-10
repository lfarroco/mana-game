import { vec2 } from "@Models/Geometry";
import * as c from "../../../../constants/constants";
import { createUIButton } from "../../../../UI/UIButton";
import * as sc from "./constants";
import { MagicOrb } from "../../../../components/MagicOrb/MagicOrb";
import { scene } from "../../BattlegroundScene";
import { tween } from "../../../../Utils/animation";
import * as AudioManager from "@Systems/AudioManager";

const NEXT_ROUND_BUTTON_X = c.SCREEN_WIDTH - 200;
const NEXT_ROUND_BUTTON_Y = c.SCREEN_HEIGHT - 100;

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
export let state: ShopUIState | null = null;

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

	state.panelX = scene.cameras.main.width / 2

	const tavernBaseY = sc.TAVERN_BASE_Y;

	const bg = scene.add.graphics()
		.fillStyle(0x000, 0.5)
		.fillRoundedRect(
			0, 0,
			sc.TAVERN_BG_WIDTH, sc.TAVERN_BG_HEIGHT,
			sc.SUB_PANEL_CORNER_RADIUS
		)
		.setPosition(state.panelX, tavernBaseY);

	state.shopContainer.add([bg]);

	const nextRoundBtn = createUIButton(
		buttonText,
		vec2(
			NEXT_ROUND_BUTTON_X,
			NEXT_ROUND_BUTTON_Y,
		),
		nextRoundCallback
	);
	state.shopContainer.add(nextRoundBtn);
	state.nextRoundButton = nextRoundBtn;

	_createSellZone(state);
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
export async function close() {
	destroyOrbs();
	await slideOut();
}
