import * as constants from "@Constants";
import * as Geometry from "@Models/Geometry";
import * as io from "../../../../io";

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
	const container = io.Container();
	const scene = container.scene;
	const background = io.BorderedRoundRect(
		Geometry.vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y),
		{ width: PANEL_WIDTH, height: PANEL_HEIGHT },
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
			activeContentContainer = io.Container(tab.buildContent(api));
			io.AddChildren(container, [activeContentContainer]);
			io.BringToTop(activeContentContainer);
			activeTabKey = key;
		},
		addMenuButtons: (buttons) => {
			io.AddChildren(container, buttons);
		},
		getMenuButtonPosition: (index) => Geometry.vec2(menuX, menuStartY + menuSpacing * index),
		getContentButtonPosition: (index) =>
			Geometry.vec2(contentCenterX, contentButtonStartY + contentButtonSpacing * index),
		createTabTitle: (text) => {
			const title = io.Title1(text);
			io.SetPosition(title, Geometry.vec2(contentCenterX, contentTitleY));
			io.Centralize(title);
			return title;
		},
	};

	io.AddChildren(container, [background, divider]);

	return api;
}
