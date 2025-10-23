import { getCurrentScene } from "@Models/State";
import OptionsScene, { TabType, LAYOUT } from "../OptionsScene";
import { audioTab } from "../components/audioTab";
import { gameTab } from "../components/gameTab";
import { graphicsTab } from "../components/graphicsTab";
import { updateTabButtonStates } from "./updateTabButtonStates";
import { cleanTabContent } from "./clearOptionElements";

export function showTab(tabType: TabType) {

	const scene = getCurrentScene() as OptionsScene;
	scene.currentTab = tabType;
	cleanTabContent();
	updateTabButtonStates();

	const startY = LAYOUT.OPTIONS_START_Y;
	const lineHeight = LAYOUT.OPTIONS_LINE_HEIGHT;

	switch (tabType) {
		case 'audio':
			scene.tabContent = audioTab(startY, lineHeight);
			break;
		case 'graphics':
			scene.tabContent = graphicsTab(startY);
			break;
		case 'game':
			scene.tabContent = gameTab(startY, lineHeight);
			break;
	}
}
