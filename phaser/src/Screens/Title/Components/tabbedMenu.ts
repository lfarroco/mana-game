import * as constants from "@Constants";
import { env, makeContainer, borderedRoundRect } from "../../../Env";

const PANEL_WIDTH = 1180;
const PANEL_HEIGHT = 500;
const PANEL_RADIUS = 24;
const PANEL_BACKGROUND_COLOR = 0x102031;
const PANEL_BACKGROUND_ALPHA = 0.58;
const DIVIDER_COLOR = 0xffffff;
const DIVIDER_ALPHA = 0.15;
const DIVIDER_WIDTH = 2;

const menuX = constants.MIDDLE_SCREEN_X - 320;
const menuStartY = constants.MIDDLE_SCREEN_Y - 90;
const menuSpacing = 90;
const dividerX = constants.MIDDLE_SCREEN_X - 150;
const contentCenterX = constants.MIDDLE_SCREEN_X + 180;
const contentTitleY = constants.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 70;
const contentButtonStartY = constants.MIDDLE_SCREEN_Y - 20;
const contentButtonSpacing = 80;

export type TabbedMenuApi = {
	container: Container;
	showTab: (key: string) => void;
	closeTab: () => void;
	addMenuButtons: (buttons: Container[]) => void;
	getMenuButtonPosition: (index: number) => Vec2;
	getContentButtonPosition: (index: number) => Vec2;
	createTabTitle: (text: string) => Phaser.GameObjects.Text;
};

type TabbedMenuDefinition = {
	key: string;
	buildContent: (menu: TabbedMenuApi) => Phaser.GameObjects.GameObject[];
};

export function createTabbedMenu(tabs: TabbedMenuDefinition[]): TabbedMenuApi {
	const container = makeContainer(env.scene);
	const scene = container.scene;
	const background = borderedRoundRect(
		env.scene,
		[constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y],
		[PANEL_WIDTH, PANEL_HEIGHT],
		PANEL_RADIUS,
		PANEL_BACKGROUND_COLOR,
		PANEL_BACKGROUND_ALPHA
	);
	const divider = scene.add.rectangle(
		dividerX,
		constants.MIDDLE_SCREEN_Y,
		DIVIDER_WIDTH,
		PANEL_HEIGHT - 70,
		DIVIDER_COLOR,
		DIVIDER_ALPHA
	);
	divider.setOrigin(0.5, 0.5);

	let activeTabKey: string | null = null;
	let activeContentContainer: Container | null = null;
	const tabIndex = new Map(tabs.map((tab) => [tab.key, tab]));

	const closeTab = () => {
		if (!activeContentContainer) {
			activeTabKey = null;
			return;
		}

		activeContentContainer.destroy(true);
		activeContentContainer = null;
		activeTabKey = null;
	};

	const api: TabbedMenuApi = {
		container,
		closeTab,
		showTab: (key) => {
			const tab = tabIndex.get(key);
			if (!tab || activeTabKey === key) {
				return;
			}

			closeTab();
			activeContentContainer = makeContainer(env.scene, tab.buildContent(api));
			container.add([activeContentContainer]);
			env.scene.children.bringToTop(activeContentContainer);
			activeTabKey = key;
		},
		addMenuButtons: (buttons) => {
			container.add(buttons);
		},
		getMenuButtonPosition: (index) => [menuX, menuStartY + menuSpacing * index],
		getContentButtonPosition: (index) =>
			[contentCenterX, contentButtonStartY + contentButtonSpacing * index],
		createTabTitle: (text) => {
			const title = env.scene.add.text(0, 0, text, constants.titleTextConfig).setOrigin(0.5);
			title.setPosition(contentCenterX, contentTitleY);
			return title;
		},
	};

	container.add([background, divider]);

	return api;
}
