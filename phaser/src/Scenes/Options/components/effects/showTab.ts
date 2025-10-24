import { LAYOUT } from "../../OptionsScene";
import { Tabs } from "@Scenes/Options/components/Model";
import { audioTab } from "../tabs/audio";
import { gameTab } from "../tabs/game";
import { graphicsTab } from "../tabs/graphics";
import { updateTabButtonStates } from "./updateTabButtonStates";
import { cleanTabContent } from "./clearOptionElements";

export let tabContent: { children: Phaser.GameObjects.GameObject[]; } = { children: [] };
export let currentTab = { key: 'audio' };

export function showTab(tabType: Tabs) {

	currentTab.key = tabType;
	cleanTabContent();
	updateTabButtonStates();

	const startY = LAYOUT.OPTIONS_START_Y;
	const lineHeight = LAYOUT.OPTIONS_LINE_HEIGHT;

	switch (tabType) {
		case 'audio':
			tabContent.children = audioTab(startY, lineHeight);
			break;
		case 'graphics':
			tabContent.children = graphicsTab(startY);
			break;
		case 'game':
			tabContent.children = gameTab(startY, lineHeight);
			break;
	}
}

