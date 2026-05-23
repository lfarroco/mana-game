import { LAYOUT } from "Client/Screens/Options/OptionsScene";
import { Tabs } from "Client/Screens/Options/components/Model";
import { audioTab } from "Client/Screens/Options/components/tabs/audio";
import { gameTab } from "Client/Screens/Options/components/tabs/game";
import { graphicsTab } from "Client/Screens/Options/components/tabs/graphics";
import { updateTabButtonStates } from "Client/Screens/Options/components/effects/updateTabButtonStates";
import { cleanTabContent } from "Client/Screens/Options/components/effects/clearOptionElements";

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
