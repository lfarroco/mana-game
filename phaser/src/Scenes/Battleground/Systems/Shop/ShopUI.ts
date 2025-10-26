import { vec2 } from "@Models/Geometry";
import * as c from "@Constants/constants";
import { Button, createUIButton } from "../../../../Components/UIButton";
import * as sc from "./constants";
import { MagicOrb } from "../../../../Components/MagicOrb/MagicOrb";
import { scene } from "../../BattlegroundScene";
import { tween } from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as SellZone from "./SellZone"

const NEXT_ROUND_BUTTON_X = c.SCREEN_WIDTH - 200;
const NEXT_ROUND_BUTTON_Y = c.SCREEN_HEIGHT - 100;

export { createUIButton };

export type ShopUIState = {
	shopContainer: Container;

	magicOrbs: MagicOrb[];
	orbContainer: Container | null;
	panelX: number;
	isOpen: boolean;
	nextRoundButton: Button | null;
	skillCircles: Phaser.GameObjects.Arc[];
}
export let state: ShopUIState | null = null;

export function create() {
	state = {
		shopContainer: scene.add.container(0, 0),
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
		"Skip",
		vec2(
			NEXT_ROUND_BUTTON_X,
			NEXT_ROUND_BUTTON_Y,
		),
		nextRoundCallback
	);
	state.shopContainer.add(nextRoundBtn.container);
	state.nextRoundButton = nextRoundBtn;

	SellZone.create();
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
	SellZone.destroy();
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

export function getShopState(): ShopUIState | null {
	return state;
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
