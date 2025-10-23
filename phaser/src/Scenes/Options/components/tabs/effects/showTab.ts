import { LAYOUT } from "../../../OptionsScene";
import { TabType } from "@Scenes/Options/components/Model";
import { audioTab } from "../audio";
import { gameTab } from "../game";
import { graphicsTab } from "../graphics";
import { updateTabButtonStates } from "./updateTabButtonStates";
import { cleanTabContent } from "./clearOptionElements";

export let tabContent: { children: Phaser.GameObjects.GameObject[]; } = { children: [] };
export let currentTab = { key: 'audio' };

export function showTab(tabType: TabType) {

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

