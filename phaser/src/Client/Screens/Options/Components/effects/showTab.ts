import { LAYOUT } from "@Screens/Options/OptionsScreen";
import { Tabs } from "@Screens/Options/Components/Model";
import { audioTab } from "@Screens/Options/Components/tabs/audio";
import { gameTab } from "@Screens/Options/Components/tabs/game";
import { graphicsTab } from "@Screens/Options/Components/tabs/graphics";
import { updateTabButtonStates } from "@Screens/Options/Components/effects/updateTabButtonStates";
import { cleanTabContent } from "@Screens/Options/Components/effects/clearOptionElements";

export const tabContent: { children: Phaser.GameObjects.GameObject[] } = { children: [] };
export const currentTab = { key: "audio" };

export function showTab(tabType: Tabs) {
	currentTab.key = tabType;
	cleanTabContent();
	updateTabButtonStates();

	const startY = LAYOUT.OPTIONS_START_Y;
	const lineHeight = LAYOUT.OPTIONS_LINE_HEIGHT;

	switch (tabType) {
		case "audio":
			tabContent.children = audioTab(startY, lineHeight);
			break;
		case "graphics":
			tabContent.children = graphicsTab(startY);
			break;
		case "game":
			tabContent.children = gameTab(startY, lineHeight);
			break;
	}
}
